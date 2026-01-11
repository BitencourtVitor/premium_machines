export const cleanAddress = (address: string): string => {
  if (!address) return address
  return address
    .replace(/,?\s*Estados Unidos da América/gi, '')
    .replace(/,?\s*United States/gi, '')
    .replace(/,?\s*USA/gi, '')
    .replace(/,?\s*US$/gi, '')
    .trim()
    .replace(/,\s*$/, '') // Remove vírgula final se houver
}
