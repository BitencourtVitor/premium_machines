import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'
import { syncMachineState, syncExtensionState } from '@/lib/allocation/synchronization'
import { updateAllocationNotification } from '@/lib/notificationService'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { data: event, error } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        requested_machine_type:machine_types!machine_type_id(id, nome),
        site:sites(id, title),
        extension:machines(id, unit_number, machine_type:machine_types(id, nome, is_attachment)),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Validate if event exists
    const { data: existingEvent, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    // Remove immutable fields and fields not present in table
    delete updateData.id
    delete updateData.created_at
    delete updateData.created_by
    // updated_by is used for audit log but might not be in the table structure if not added
    // If the table has updated_by column, keep it. If not, delete it.
    // Assuming standard Supabase pattern where updated_by might not be a column on the event itself
    // but we use it for audit. Let's try to keep it but if it fails we know why.
    // Actually, to be safe against "column does not exist" error, let's remove it from updateData
    // since we already extracted it for audit log above (actually we need to extract it)
    
    const userId = body.updated_by
    delete updateData.updated_by
    
    // Clean nulls for UUIDs and optional fields again just in case (though frontend handles it)
    if (updateData.site_id === '') updateData.site_id = null
    if (updateData.extension_id === '') updateData.extension_id = null
    if (updateData.corrects_event_id === '') updateData.corrects_event_id = null
    if (updateData.construction_type === '') updateData.construction_type = null
    if (updateData.lot_building_number === '') updateData.lot_building_number = null
    if (updateData.downtime_reason === '') updateData.downtime_reason = null
    if (updateData.end_date === '') updateData.end_date = null
    
    // event_date should NEVER be null as it's a required field in DB
    if (updateData.event_date === '') delete updateData.event_date

    // Remove joined objects that might be in the body if it came from a full event object
    delete updateData.machine
    delete updateData.site
    delete updateData.extension
    delete updateData.supplier
    delete updateData.machine_type
    delete updateData.created_by_user

    const { data: updatedEvent, error: updateError } = await supabaseServer
      .from('allocation_events')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        machine:machines(id, unit_number),
        machine_type:machine_types!machine_type_id(id, nome),
        site:sites(id, title),
        extension:machines(id, unit_number, machine_type:machine_types(id, nome, is_attachment)),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar evento' },
        { status: 500 }
      )
    }

    // Synchronize state if necessary
    if (updatedEvent.machine_id) {
      await syncMachineState(updatedEvent.machine_id)
    }
    if (updatedEvent.extension_id) {
      await syncExtensionState(updatedEvent.extension_id)
    }

    // Update notifications if necessary
    await updateAllocationNotification(updatedEvent)

    // Log action
    await createAuditLog({
      entidade: 'allocation_events',
      entidade_id: id,
      acao: 'update',
      dados_antes: existingEvent,
      dados_depois: updatedEvent,
      usuario_id: userId || existingEvent.created_by,
    })

    return NextResponse.json({ success: true, event: updatedEvent })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    // Validate if event exists
    const { data: existingEvent, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabaseServer
      .from('allocation_events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar evento' },
        { status: 500 }
      )
    }

    // Delete associated notifications
    await supabaseServer
      .from('notifications')
      .delete()
      .eq('event_id', id)
      .eq('root_type', 'allocation_due')

    // Log action
    await createAuditLog({
      entidade: 'allocation_events',
      entidade_id: id,
      acao: 'delete',
      dados_antes: existingEvent,
      usuario_id: userId || 'unknown',
    })

    // Delete files from storage
    try {
      // 1. List all files in the folder
      const { data: files, error: listError } = await supabaseServer.storage
        .from('Allocation Documents')
        .list(id)

      if (!listError && files && files.length > 0) {
        // 2. Prepare paths for deletion
        const filesToDelete = files.map(file => `${id}/${file.name}`)
        
        // 3. Remove all files (this effectively deletes the folder)
        const { error: storageDeleteError } = await supabaseServer.storage
          .from('Allocation Documents')
          .remove(filesToDelete)

        if (storageDeleteError) {
          console.error('Error deleting files from storage:', storageDeleteError)
        }
      }
    } catch (storageError) {
      console.error('Unexpected error deleting storage folder:', storageError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
