// Função para formatar telefone americano: +1 (XXX) XXX-XXXX ou (XXX) XXX-XXXX
export function formatUSPhone(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')
  
  // Verifica se começa com 1 (código do país)
  const hasCountryCode = numbers.startsWith('1') && numbers.length > 10
  const phoneNumbers = hasCountryCode ? numbers.slice(1) : numbers
  
  // Limita a 10 dígitos (sem o código do país)
  const limited = phoneNumbers.slice(0, 10)
  
  // Aplica a máscara
  if (limited.length === 0) {
    return hasCountryCode ? '+1 ' : ''
  } else if (limited.length <= 3) {
    return hasCountryCode ? `+1 (${limited}` : `(${limited}`
  } else if (limited.length <= 6) {
    return hasCountryCode 
      ? `+1 (${limited.slice(0, 3)}) ${limited.slice(3)}`
      : `(${limited.slice(0, 3)}) ${limited.slice(3)}`
  } else {
    return hasCountryCode
      ? `+1 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
      : `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
  }
}
