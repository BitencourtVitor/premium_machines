import { supabaseServer } from '@/lib/supabase-server'

const EVENT_LABELS: Record<string, string> = {
  start_allocation: 'Início de Locação',
  end_allocation: 'Encerramento de Locação',
  downtime_start: 'Início de Manutenção',
  downtime_end: 'Fim de Manutenção',
  transport_start: 'Início de Transporte',
  transport_arrival: 'Chegada em Obra',
  request_allocation: 'Solicitação de Locação',
  refueling: 'Abastecimento',
  extension_attach: 'Acoplamento de Extensão',
  extension_detach: 'Desacoplamento de Extensão',
}

const DOWNTIME_REASON_LABELS: Record<string, string> = {
  corrective: 'Corretiva',
  preventive: 'Preventiva',
  scheduled: 'Programada',
  inspection: 'Inspeção',
}

async function buildTransporter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = await import('nodemailer' as any)
  return nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_APP_PASSWORD },
  })
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return d
  }
}

function fmtDateOnly(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('pt-BR')
  } catch {
    return d
  }
}

function row(label: string, value: string | null | undefined, html: string = ''): string {
  if (!value && !html) return ''
  return `
    <tr>
      <td style="padding:6px 12px 6px 0; vertical-align:top; color:#6b7280; font-size:13px; white-space:nowrap;"><strong>${label}</strong></td>
      <td style="padding:6px 0; vertical-align:top; color:#111827; font-size:13px;">${html || escapeHtml(String(value))}</td>
    </tr>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildEmailContent(event: any): { subject: string; html: string; text: string } {
  const label = EVENT_LABELS[event.event_type] || event.event_type
  const machine = event.machine?.unit_number || event.requested_machine_type?.nome || 'N/A'
  const machineType = event.machine?.machine_type?.nome || event.requested_machine_type?.nome || ''
  const site = event.site?.title || '—'
  const siteAddress = event.site?.address || ''
  const user = event.created_by_user?.nome || 'Sistema'

  const isBackcharge =
    event.event_type === 'downtime_start' &&
    event.downtime_reason === 'corrective' &&
    event.gera_backcharge === true

  // Subject
  const subjectPrefix = isBackcharge ? '[Machines] ⚠ BACKCHARGE — ' : '[Machines] '
  const subject = `${subjectPrefix}${label} — ${machine}`

  // Local (House/Building)
  let local = ''
  if (event.construction_type === 'house') {
    local = event.lot_building_number ? `House ${event.lot_building_number}` : 'House'
  } else if (event.construction_type === 'building' && event.lot_building_number) {
    local = `Building ${event.lot_building_number}`
  }

  // Quem vai usar (start_allocation)
  let usedByText = ''
  if (event.event_type === 'start_allocation' && event.used_by && event.used_by.length > 0) {
    const parts: string[] = []
    if (event.used_by.includes('premium')) parts.push('Premium')
    if (event.used_by.includes('subcontractor')) {
      const subs = event.allocation_subcontractors || []
      if (subs.length > 0) {
        parts.push(`Subcontratado (${subs.join(', ')})`)
      } else {
        parts.push('Subcontratado')
      }
    }
    usedByText = parts.join(' + ')
  }

  // Backcharge section
  let backchargeHtml = ''
  if (isBackcharge) {
    const subcontractors = (event.backcharge_suppliers || [])
      .map((s: any) => s.nome || s)
      .filter(Boolean)
    const receiptLinks = (event.subcontractor_receipt_links || []).filter((l: any) => l?.url)

    const subsHtml = subcontractors.length > 0
      ? subcontractors.map((n: string) => `<span style="display:inline-block; margin-right:6px; padding:2px 8px; background:#fef3c7; color:#92400e; border-radius:10px; font-size:12px;">${escapeHtml(n)}</span>`).join('')
      : '<em style="color:#9ca3af;">Nenhum informado</em>'

    const receiptsHtml = receiptLinks.length > 0
      ? receiptLinks.map((l: any, i: number) => `<a href="${escapeHtml(l.url)}" style="color:#2563eb; text-decoration:underline;">${escapeHtml(l.name || `Documento ${i + 1}`)}</a>`).join(' &nbsp; ')
      : '<em style="color:#9ca3af;">Nenhum anexado</em>'

    backchargeHtml = `
      <div style="margin:20px 0; padding:16px; background:#fffbeb; border-left:4px solid #f59e0b; border-radius:6px;">
        <h3 style="margin:0 0 12px 0; color:#92400e; font-size:15px;">⚠ BACKCHARGE — Cobrança Retroativa</h3>
        <table style="width:100%; border-collapse:collapse;">
          ${row('Subcontratados', '', subsHtml)}
          ${row('Documento de recibo', '', receiptsHtml)}
        </table>
      </div>`
  }

  // Sharepoint links
  let sharepointHtml = ''
  const sharepointLinks = (event.sharepoint_links || []).filter((l: any) => l?.url)
  if (sharepointLinks.length > 0) {
    sharepointHtml = sharepointLinks
      .map((l: any, i: number) => `<a href="${escapeHtml(l.url)}" style="color:#2563eb; text-decoration:underline;">${escapeHtml(l.name || `Documento ${i + 1}`)}</a>`)
      .join(' &nbsp; ')
  }

  // Build HTML
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f9fafb; color:#111827;">
  <div style="max-width:640px; margin:0 auto; padding:24px;">
    <div style="background:white; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); overflow:hidden;">
      <div style="padding:20px 24px; border-bottom:1px solid #e5e7eb; ${isBackcharge ? 'background:#fffbeb;' : ''}">
        <p style="margin:0; font-size:11px; font-weight:700; letter-spacing:1px; color:${isBackcharge ? '#92400e' : '#6b7280'}; text-transform:uppercase;">${isBackcharge ? '⚠ Backcharge — ' : ''}Evento Registrado</p>
        <h1 style="margin:4px 0 0 0; font-size:20px; color:#111827;">${escapeHtml(label)}</h1>
        <p style="margin:4px 0 0 0; font-size:14px; color:#6b7280;">${escapeHtml(machine)}${machineType ? ` · ${escapeHtml(machineType)}` : ''}</p>
      </div>

      <div style="padding:20px 24px;">
        <table style="width:100%; border-collapse:collapse;">
          ${row('Obra', site)}
          ${siteAddress ? row('Endereço', siteAddress) : ''}
          ${local ? row('Local', local) : ''}
          ${row('Data do Evento', fmtDate(event.event_date))}
          ${event.event_type === 'start_allocation' && event.end_date ? row('Vencimento previsto', fmtDateOnly(event.end_date)) : ''}
          ${event.event_type === 'start_allocation' && usedByText ? row('Quem vai usar', usedByText) : ''}
          ${event.downtime_reason ? row('Motivo', DOWNTIME_REASON_LABELS[event.downtime_reason] || event.downtime_reason) : ''}
          ${event.downtime_description ? row('Descrição do problema', event.downtime_description) : ''}
          ${event.correction_description ? row('Descrição da correção', event.correction_description) : ''}
          ${event.supplier?.nome ? row('Fornecedor', event.supplier.nome) : ''}
          ${event.extension?.unit_number ? row('Extensão / Acessório', `${event.extension.unit_number}${event.extension.machine_type?.nome ? ` (${event.extension.machine_type.nome})` : ''}`) : ''}
          ${event.requested_by_name ? row('Solicitante', `${event.requested_by_name}${event.requested_at ? ` (${fmtDateOnly(event.requested_at)})` : ''}`) : ''}
          ${event.validated_by_name ? row('Validador', `${event.validated_by_name}${event.validated_at ? ` (${fmtDateOnly(event.validated_at)})` : ''}`) : ''}
          ${sharepointHtml ? row('Documentos', '', sharepointHtml) : ''}
          ${event.notas ? row('Notas', event.notas) : ''}
        </table>

        ${backchargeHtml}
      </div>

      <div style="padding:14px 24px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:12px; color:#9ca3af;">
        Registrado por <strong style="color:#6b7280;">${escapeHtml(user)}</strong> em ${fmtDate(event.created_at)}
      </div>
    </div>
    <p style="text-align:center; margin:16px 0 0 0; font-size:11px; color:#9ca3af;">Notificação automática · Machines System</p>
  </div>
</body>
</html>`

  // Build plain text fallback
  const lines: string[] = []
  lines.push(`${isBackcharge ? '⚠ BACKCHARGE — ' : ''}${label}`)
  lines.push(`Máquina: ${machine}${machineType ? ` (${machineType})` : ''}`)
  lines.push(`Obra: ${site}`)
  if (siteAddress) lines.push(`Endereço: ${siteAddress}`)
  if (local) lines.push(`Local: ${local}`)
  lines.push(`Data: ${fmtDate(event.event_date)}`)
  if (event.event_type === 'start_allocation' && event.end_date) lines.push(`Vencimento: ${fmtDateOnly(event.end_date)}`)
  if (usedByText) lines.push(`Quem vai usar: ${usedByText}`)
  if (event.downtime_reason) lines.push(`Motivo: ${DOWNTIME_REASON_LABELS[event.downtime_reason] || event.downtime_reason}`)
  if (event.downtime_description) lines.push(`Problema: ${event.downtime_description}`)
  if (event.correction_description) lines.push(`Correção: ${event.correction_description}`)
  if (event.supplier?.nome) lines.push(`Fornecedor: ${event.supplier.nome}`)
  if (event.extension?.unit_number) lines.push(`Extensão: ${event.extension.unit_number}`)
  if (event.requested_by_name) lines.push(`Solicitante: ${event.requested_by_name}`)
  if (event.validated_by_name) lines.push(`Validador: ${event.validated_by_name}`)
  if (event.notas) lines.push(`Notas: ${event.notas}`)
  if (isBackcharge) {
    lines.push('')
    lines.push('=== BACKCHARGE — COBRANÇA RETROATIVA ===')
    const subs = (event.backcharge_suppliers || []).map((s: any) => s.nome || s).filter(Boolean)
    lines.push(`Subcontratados: ${subs.length > 0 ? subs.join(', ') : 'Nenhum informado'}`)
    const receipts = (event.subcontractor_receipt_links || []).filter((l: any) => l?.url)
    if (receipts.length > 0) {
      lines.push('Documentos de recibo:')
      receipts.forEach((l: any) => lines.push(`  - ${l.name || 'Documento'}: ${l.url}`))
    }
  }
  lines.push('')
  lines.push(`Registrado por: ${user} em ${fmtDate(event.created_at)}`)
  const text = lines.join('\n')

  return { subject, html, text }
}

async function sendToEmails(emails: string[], subject: string, html: string, text: string) {
  if (emails.length === 0) return
  const transporter = await buildTransporter()
  await transporter.sendMail({
    from: `"Machines System" <${process.env.SMTP_USER}>`,
    to: emails.join(', '),
    subject,
    html,
    text,
  })
}

export async function sendEventNotification(eventId: string): Promise<void> {
  try {
    const { data: event } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines!machine_id(unit_number, machine_type:machine_types(nome)),
        extension:machines!extension_id(unit_number, machine_type:machine_types(nome)),
        site:sites(title, address),
        supplier:suppliers(nome),
        requested_machine_type:machine_types!machine_type_id(nome),
        created_by_user:users!created_by(nome)
      `)
      .eq('id', eventId)
      .single()
    if (!event) return

    const { subject, html, text } = buildEmailContent(event)

    const isBackcharge =
      event.event_type === 'downtime_start' &&
      event.downtime_reason === 'corrective' &&
      event.gera_backcharge === true

    // Coleta destinatários ativos: união (geral + backcharge se aplicável), sem duplicar
    const targetLists = isBackcharge ? ['geral', 'manutencao_corretiva'] : ['geral']
    const { data: recipients } = await supabaseServer
      .from('email_recipients')
      .select('email')
      .in('lista', targetLists)
      .eq('active', true)

    const uniqueEmails = Array.from(new Set((recipients || []).map((r: any) => r.email)))
    await sendToEmails(uniqueEmails, subject, html, text)
  } catch (err) {
    console.error('[sendEventNotification] failed:', err)
  }
}
