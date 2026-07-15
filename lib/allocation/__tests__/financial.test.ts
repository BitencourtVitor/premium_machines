import { minimizeBlockCost } from '../financial'

describe('minimizeBlockCost', () => {
  // Taxas fictícias de exemplo, sem relação com nenhum fornecedor real — só pra exercitar o
  // motor de minimização (fourWeek propositalmente igual a 2x weekly, pra testar o empate).
  const rates = { daily: 100, weekly: 180, fourWeek: 360 }

  it('10 dias -> 1 semana + 3 diárias quando o bloco de 4-semanas não compensa', () => {
    // Taxas onde subir pro bloco de 4-semanas NÃO vale a pena pra só 10 dias
    // (diferente do caso abaixo, onde o bloco de 4-semanas já é mais barato).
    const genericRates = { daily: 100, weekly: 600, fourWeek: 3000 }
    const result = minimizeBlockCost(10, genericRates)
    expect(result?.breakdown).toEqual({ fourWeekBlocks: 0, weeks: 1, days: 3 })
    expect(result?.cost).toBe(1 * 600 + 3 * 100)
  })

  it('10 dias -> mais barato já fechar o bloco de 4-semanas do que 1 semana + 3 diárias', () => {
    const result = minimizeBlockCost(10, rates)
    expect(result?.cost).toBe(360)
    expect(result?.cost).toBeLessThan(1 * rates.weekly + 3 * rates.daily)
  })

  it('14 dias -> empate entre 2 semanas e 1 bloco de 4-semanas, prioriza o bloco maior', () => {
    const result = minimizeBlockCost(14, rates)
    expect(result?.cost).toBe(360)
    expect(result?.breakdown).toEqual({ fourWeekBlocks: 1, weeks: 0, days: 0 })
  })

  it('15 dias -> mais barato fechar direto o bloco de 4-semanas do que 2 semanas + 1 diária', () => {
    const result = minimizeBlockCost(15, rates)
    // 2 semanas + 1 diária custaria 2*180 + 1*100 = 460, mais caro que o bloco de 4-semanas (360)
    expect(result?.cost).toBe(360)
    expect(result?.breakdown).toEqual({ fourWeekBlocks: 1, weeks: 0, days: 0 })
    expect(result!.cost).toBeLessThan(2 * rates.weekly + 1 * rates.daily)
  })

  it('0 dias -> custo zero', () => {
    expect(minimizeBlockCost(0, rates)).toEqual({ cost: 0, breakdown: { fourWeekBlocks: 0, weeks: 0, days: 0 } })
  })

  it('sem nenhuma taxa disponível -> null', () => {
    expect(minimizeBlockCost(10, { daily: null, weekly: null, fourWeek: null })).toBeNull()
  })

  it('só taxa diária disponível -> cai pra linear', () => {
    const result = minimizeBlockCost(5, { daily: 100, weekly: null, fourWeek: null })
    expect(result).toEqual({ cost: 500, breakdown: { fourWeekBlocks: 0, weeks: 0, days: 5 } })
  })

  it('só taxa de 4-semanas disponível -> sempre fecha em blocos de 28 dias', () => {
    const result = minimizeBlockCost(10, { daily: null, weekly: null, fourWeek: 1000 })
    expect(result).toEqual({ cost: 1000, breakdown: { fourWeekBlocks: 1, weeks: 0, days: 0 } })
  })
})
