/** Formata número como moeda BRL: R$ 1.200,00 */
export function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Formata número como percentual: 87% */
export function fmtPct(n: number): string {
  return `${Math.round(n)}%`
}
