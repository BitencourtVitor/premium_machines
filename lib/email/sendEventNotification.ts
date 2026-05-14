import { supabaseServer } from '@/lib/supabase-server'

const EVENT_LABELS: Record<string, string> = {
  start_allocation: 'Início de Locação',
  end_allocation: 'Encerramento de Locação',
  downtime_start: 'Início de Manutenção',
  downtime_end: 'Fim de Manutenção',
  transport_start: 'Início de Transporte',
  transport_arrival: 'Chegada',
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

async function sendToList(lista: string, subject: string, text: string, excludeEmails: string[] = []) {
  const { data: recipients } = await supabaseServer
    .from('email_recipients')
    .select('email, nome')
    .eq('lista', lista)
    .eq('active', true)
  if (!recipients || recipients.length === 0) return
  const filtered = excludeEmails.length
    ? recipients.filter((r: any) => !excludeEmails.includes(r.email))
    : recipients
  if (filtered.length === 0) return
  const transporter = await buildTransporter()
  await transporter.sendMail({
    from: `"Machines System" <${process.env.SMTP_USER}>`,
    to: filtered.map((r: any) => `${r.nome} <${r.email}>`).join(', '),
    subject,
    text,
  })
}

export async function sendEventNotification(eventId: string): Promise<void> {
  try {
    const { data: event } = await supabaseServer
      .from('allocation_events')
      .select(`*, machine:machines!machine_id(unit_number), site:sites(title), created_by_user:users!created_by(nome)`)
      .eq('id', eventId)
      .single()
    if (!event) return

    const label = EVENT_LABELS[event.event_type] || event.event_type
    const machine = event.machine?.unit_number || 'N/A'
    const site = event.site?.title || 'N/A'
    const date = new Date(event.event_date).toLocaleDateString('pt-BR')
    const user = event.created_by_user?.nome || 'Sistema'

    const subject = `[Machines] ${label} — ${machine}`
    const text = `Evento registrado no sistema Machines:\n\nTipo: ${label}\nMáquina: ${machine}\nObra: ${site}\nData: ${date}\nRegistrado por: ${user}${event.notas ? `\nNotas: ${event.notas}` : ''}`

    // Enviar para lista geral
    await sendToList('geral', subject, text)

    // Enviar para lista de manutenção corretiva se aplicável (sem duplicar quem já está em 'geral')
    const isCorrectiveBackcharge =
      event.event_type === 'downtime_start' &&
      event.downtime_reason === 'corrective' &&
      event.gera_backcharge === true

    if (isCorrectiveBackcharge) {
      const { data: geralRecipients } = await supabaseServer
        .from('email_recipients')
        .select('email')
        .eq('lista', 'geral')
        .eq('active', true)
      const geralEmails = (geralRecipients || []).map((r: any) => r.email)

      const backchargeLabel = `[Machines] Backcharge — Manutenção Corretiva — ${machine}`
      const backchargeText = `Manutenção corretiva com backcharge registrada:\n\nMáquina: ${machine}\nObra: ${site}\nData: ${date}\nRegistrado por: ${user}${event.notas ? `\nNotas: ${event.notas}` : ''}`
      await sendToList('manutencao_corretiva', backchargeLabel, backchargeText, geralEmails)
    }
  } catch (err) {
    console.error('[sendEventNotification] failed:', err)
  }
}
