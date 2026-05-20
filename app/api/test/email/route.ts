import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/email
 * Testa a conexão SMTP e lista destinatários cadastrados.
 *
 * POST /api/test/email
 * Body: { to?: string }   (se omitido, usa o primeiro destinatário ativo da lista geral)
 * Envia um e-mail de teste real.
 */

async function buildTransporter() {
  const nm = await import('nodemailer' as any)
  const createTransport: Function = nm.createTransport ?? nm.default?.createTransport
  if (typeof createTransport !== 'function') {
    throw new Error('nodemailer.createTransport not found — check installation')
  }
  return createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_APP_PASSWORD },
  })
}

export async function GET() {
  const result: Record<string, any> = {
    env: {
      SMTP_HOST: process.env.SMTP_HOST || '(não definido)',
      SMTP_PORT: process.env.SMTP_PORT || '(não definido)',
      SMTP_USER: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}***` : '(não definido)',
      SMTP_APP_PASSWORD: process.env.SMTP_APP_PASSWORD ? '***definido***' : '(não definido)',
    },
    smtp_verify: null,
    recipients: [],
  }

  // Testar SMTP
  try {
    const transporter = await buildTransporter()
    await transporter.verify()
    result.smtp_verify = 'OK — autenticação bem-sucedida'
  } catch (err: any) {
    result.smtp_verify = `ERRO: ${err?.message || String(err)} (code: ${err?.code}, response: ${err?.response})`
  }

  // Listar destinatários
  try {
    const { data, error } = await supabaseServer
      .from('email_recipients')
      .select('id, email, nome, lista, active')
      .order('lista', { ascending: true })
    if (error) {
      result.recipients = `Erro ao buscar destinatários: ${error.message}`
    } else {
      result.recipients = data || []
    }
  } catch (err: any) {
    result.recipients = `Exceção: ${err?.message}`
  }

  const ok = typeof result.smtp_verify === 'string' && result.smtp_verify.startsWith('OK')
  return NextResponse.json({ success: ok, ...result })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    let to: string = body.to || ''

    if (!to) {
      const { data } = await supabaseServer
        .from('email_recipients')
        .select('email')
        .eq('active', true)
        .limit(1)
        .single()
      to = data?.email || ''
    }

    if (!to) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum destinatário encontrado. Forneça { "to": "email@exemplo.com" } no body ou cadastre destinatários.',
      }, { status: 400 })
    }

    const transporter = await buildTransporter()
    await transporter.sendMail({
      from: `"Machines System [TESTE]" <${process.env.SMTP_USER}>`,
      to,
      subject: '[Machines] Teste de e-mail — ' + new Date().toLocaleString('pt-BR'),
      html: `
        <div style="font-family:sans-serif; padding:24px; max-width:480px;">
          <h2 style="color:#111827;">✅ E-mail de teste</h2>
          <p style="color:#374151;">Se você está lendo isso, o sistema de notificação por e-mail está funcionando corretamente.</p>
          <p style="color:#6b7280; font-size:12px;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
        </div>`,
      text: `E-mail de teste Machines System — ${new Date().toLocaleString('pt-BR')}`,
    })

    return NextResponse.json({ success: true, message: `E-mail de teste enviado para ${to}` })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err?.message || String(err),
      code: err?.code,
      response: err?.response,
    }, { status: 500 })
  }
}
