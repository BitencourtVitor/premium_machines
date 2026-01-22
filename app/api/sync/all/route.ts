import { NextResponse } from 'next/server'
import { syncAllMachineStates } from '@/lib/allocationService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sync/all
 *
 * Sincroniza o estado de todas as máquinas no banco
 * com base nos eventos aprovados
 */
export async function POST() {
  try {
    const result = await syncAllMachineStates()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Sincronização completa: ${result.synced} máquinas sincronizadas`,
        synced: result.synced,
        errors: result.errors.length > 0 ? result.errors : undefined
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Erro na sincronização',
        errors: result.errors
      }, { status: 500 })
    }
  } catch (error: any) {

    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}