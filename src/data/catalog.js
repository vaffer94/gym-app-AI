// Tassonomia fissa delle categorie (non estendibile dall'utente)
export const CATEGORIES = [
  { id: 'braccia_sup', label: 'Braccia', emoji: '💪' },
  { id: 'braccia_inf', label: 'Avambracci', emoji: '✊' },
  { id: 'spalle', label: 'Spalle', emoji: '🤸' },
  { id: 'petto', label: 'Petto', emoji: '🛡️' },
  { id: 'schiena', label: 'Schiena', emoji: '🧗' },
  { id: 'core', label: 'Core / Addome', emoji: '🍫' },
  { id: 'gambe_sup', label: 'Gambe', emoji: '🦵' },
  { id: 'gambe_inf', label: 'Polpacci', emoji: '🦶' },
  { id: 'cardio', label: 'Cardio', emoji: '❤️' },
  { id: 'collo', label: 'Collo', emoji: '🦒' },
]

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || { id, label: id, emoji: '🏋️' }

export const EQUIPMENT_LABELS = {
  'body only': 'corpo libero',
  dumbbell: 'manubri',
  barbell: 'bilanciere',
  cable: 'cavi',
  machine: 'macchina',
  kettlebells: 'kettlebell',
  bands: 'elastici',
  'medicine ball': 'palla medica',
  'exercise ball': 'fitball',
  'foam roll': 'foam roller',
  'e-z curl bar': 'bilanciere EZ',
  other: 'altro',
}

export const LEVEL_LABELS = {
  beginner: 'principiante',
  intermediate: 'intermedio',
  expert: 'avanzato',
}

let _catalog = null

/** Carica il catalogo (lazy: il JSON pesa ~MB, entra nel bundle solo quando serve) */
export async function loadCatalog() {
  if (!_catalog) {
    const mod = await import('./catalog.json')
    _catalog = mod.default
  }
  return _catalog
}

/** Ricerca per nome + filtro categoria */
export function searchCatalog(catalog, query, category) {
  const q = query.trim().toLowerCase()
  return catalog.filter((e) => {
    if (category && e.category !== category) return false
    if (q && !e.name.toLowerCase().includes(q)) return false
    return true
  })
}
