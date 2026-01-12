import { GET } from '../route'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: init?.headers
    }))
  }
}))

// Mock supabase-server
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOr = jest.fn()
const mockOrder = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (table: string) => {
      mockFrom(table)
      return {
        select: (columns: string) => {
          mockSelect(columns)
          return {
            eq: (column: string, value: any) => {
              mockEq(column, value)
              return {
                order: (column: string, options: any) => {
                  mockOrder(column, options)
                  return Promise.resolve({
                    data: global.mockUsersData,
                    error: global.mockUsersError
                  })
                }
              }
            },
            or: (query: string) => {
              mockOr(query)
              return {
                order: (column: string, options: any) => {
                  mockOrder(column, options)
                  return Promise.resolve({
                    data: global.mockUsersData,
                    error: global.mockUsersError
                  })
                }
              }
            }
          }
        }
      }
    }
  }
}))

declare global {
  var mockUsersData: any[] | null
  var mockUsersError: any | null
}

describe('Users API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.mockUsersData = null
    global.mockUsersError = null
  })

  it('should fetch users with validado=true or null filter', async () => {
    global.mockUsersData = [
      { id: '1', nome: 'User 1', role: 'admin' },
      { id: '2', nome: 'User 2', role: 'operador' }
    ]

    const response = await GET()
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.users).toHaveLength(2)
    
    // Verify that the query included .or('validado.eq.true,validado.is.null')
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockSelect).toHaveBeenCalledWith('id, nome, role, supplier_id')
    expect(mockOr).toHaveBeenCalledWith('validado.eq.true,validado.is.null')
    expect(mockOrder).toHaveBeenCalledWith('nome', { ascending: true })
  })

  it('should handle database errors gracefully', async () => {
    global.mockUsersError = { message: 'DB Error' }

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toBe('Erro ao buscar usuários')
  })
})
