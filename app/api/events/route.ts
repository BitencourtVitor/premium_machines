import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { validateEvent } from '@/lib/allocationService'
import { createAuditLog } from '@/lib/auditLog'
import { getActiveDowntimeByMachine } from '@/lib/allocationService'
import { updateAllocationNotification } from '@/lib/notificationService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('API: GET /api/events')
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const machineId = searchParams.get('machine_id')
    const siteId = searchParams.get('site_id')
    const status = searchParams.get('status')
    const eventType = searchParams.get('event_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        requested_machine_type:machine_types!machine_type_id(id, nome),
        site:sites(id, title, address),
        extension:machines(id, unit_number, machine_type:machine_types(id, nome, is_attachment)),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)

    if (machineId) {
      query = query.eq('machine_id', machineId)
    }

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    if (startDate) {
      query = query.gte('event_date', startDate)
    }

    if (endDate) {
      query = query.lte('event_date', endDate)
    }

    const { data: events, error } = await query
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar eventos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, events })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validações básicas
    const isRequest = body.event_type === 'request_allocation'
    const requiresMachineId = body.event_type !== 'extension_attach' && !isRequest
    
    if (!body.event_type || (requiresMachineId && !body.machine_id) || !body.event_date || !body.created_by) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios: event_type, event_date, created_by e machine_id (exceto para extensão e solicitações)' },
        { status: 400 }
      )
    }

    // Para solicitações, machine_id pode ser nulo se machine_type_id estiver presente
    if (isRequest && !body.machine_id && !body.machine_type_id) {
      return NextResponse.json(
        { success: false, message: 'Para solicitações, informe o tipo de máquina' },
        { status: 400 }
      )
    }

    // Se for downtime_end e não tiver corrects_event_id, buscar automaticamente
    if (body.event_type === 'downtime_end' && !body.corrects_event_id) {
      const activeDowntime = await getActiveDowntimeByMachine(body.machine_id)
      if (activeDowntime) {
        body.corrects_event_id = activeDowntime.downtime_event_id
        body.site_id = activeDowntime.site_id
      }
    }

    // Validação usando o allocationService
    const validation = await validateEvent(body)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.reason },
        { status: 400 }
      )
    }

    // Create the event
    const { data: event, error } = await supabaseServer
      .from('allocation_events')
      .insert({
        event_type: body.event_type,
        machine_id: body.machine_id,
        site_id: body.site_id || null,
        extension_id: body.extension_id || null,
        construction_type: body.construction_type || null,
        lot_building_number: body.lot_building_number || null,
        event_date: body.event_date,
        end_date: body.end_date || null,
        downtime_reason: body.downtime_reason || null,
        downtime_description: body.downtime_description || null,
        supplier_id: body.supplier_id || null,
        machine_type_id: body.machine_type_id || null,
        corrects_event_id: body.corrects_event_id || null,
        correction_description: body.correction_description || null,
        notas: body.notas || null,
        sharepoint_links: body.sharepoint_links || [],
        created_by: body.created_by,
        status: body.event_type === 'refueling' ? 'pending' : 'approved',
      })
      .select(`
        *,
        machine:machines(id, unit_number),
        requested_machine_type:machine_types!machine_type_id(id, nome),
        site:sites(id, title),
        extension:machines(id, unit_number, machine_type:machine_types(id, nome, is_attachment)),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json({ success: false, message: 'Erro ao criar evento' }, { status: 500 })
    }

    // Log action
    await createAuditLog({
      entidade: 'allocation_events',
      entidade_id: event.id,
      acao: 'insert',
      dados_depois: event,
      usuario_id: body.created_by,
    })

    // Update notifications if applicable
    await updateAllocationNotification(event)

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}
