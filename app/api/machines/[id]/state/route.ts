import { NextRequest, NextResponse } from 'next/server'
import { calculateMachineAllocationState } from '@/lib/allocation/stateCalculation'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const state = await calculateMachineAllocationState(params.id)
    return NextResponse.json({ success: true, state })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
