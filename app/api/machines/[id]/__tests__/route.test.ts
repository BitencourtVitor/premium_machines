import { DELETE } from '../route'

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status || 200 }))
  }
}))

const mockUpdate = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: (global as any).mockMachine })
        })
      }),
      update: (values: any) => {
        mockUpdate(values)
        return { eq: () => Promise.resolve({ error: null }) }
      }
    })
  }
}))

jest.mock('@/lib/auditLog', () => ({ createAuditLog: jest.fn() }))

jest.mock('@/lib/allocation/queries', () => ({
  getActiveAllocations: () => Promise.resolve((global as any).mockActiveAllocations)
}))

const request = { json: () => Promise.resolve({ currentUserId: 'u1' }) } as any
const params = { params: { id: 'm1' } }

describe('DELETE /api/machines/[id]', () => {
  beforeEach(() => {
    mockUpdate.mockClear()
    ;(global as any).mockMachine = { id: 'm1', status: 'available', current_site_id: null }
    ;(global as any).mockActiveAllocations = []
  })

  it('bloqueia máquina alocada pelos eventos mesmo com colunas gravadas dizendo disponível', async () => {
    ;(global as any).mockActiveAllocations = [{ machine_id: 'm1' }]

    const res: any = await DELETE(request, params)

    expect(res.status).toBe(400)
    expect(res.data.message).toMatch(/alocada/)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('desativa (soft delete) máquina sem alocação ativa', async () => {
    const res: any = await DELETE(request, params)

    expect(res.data.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ ativo: false })
  })

  it('retorna 404 quando a máquina não existe', async () => {
    ;(global as any).mockMachine = null

    const res: any = await DELETE(request, params)

    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
