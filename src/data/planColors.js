/** Palette colori per le schede (toni soft coerenti col design cartoon) */
export const PLAN_COLORS = [
  '#FFE1D3', // pesca
  '#D5F4F1', // acqua
  '#FFF3C7', // limone
  '#E4D9FF', // lilla
  '#FFD9EC', // rosa
  '#DDF3D5', // menta
  '#D9E9FF', // cielo
  '#F3E3C9', // sabbia
]

/** Colore di default: casuale tra quelli non ancora usati dalle altre schede */
export function pickDefaultColor(usedColors = []) {
  const free = PLAN_COLORS.filter((c) => !usedColors.includes(c))
  const pool = free.length > 0 ? free : PLAN_COLORS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}
