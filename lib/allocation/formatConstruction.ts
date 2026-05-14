export function formatConstruction(
  type: 'house' | 'building' | null | undefined,
  number: string | null | undefined
): string {
  if (!type) return ''
  if (type === 'house') return 'House'
  return `Building ${number ?? ''}`.trim()
}
