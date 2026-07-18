/**
 * Scarica free-exercise-db (pubblico dominio) e genera src/data/catalog.json
 * mappando i muscoli sulla tassonomia a 10 categorie dell'app.
 * Uso: npm run build:catalog
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'catalog.json')

// muscolo primario -> categoria dell'app
const MUSCLE_TO_CAT = {
  biceps: 'braccia_sup',
  triceps: 'braccia_sup',
  forearms: 'braccia_inf',
  shoulders: 'spalle',
  traps: 'spalle',
  chest: 'petto',
  lats: 'schiena',
  'middle back': 'schiena',
  'lower back': 'schiena',
  abdominals: 'core',
  quadriceps: 'gambe_sup',
  hamstrings: 'gambe_sup',
  glutes: 'gambe_sup',
  adductors: 'gambe_sup',
  abductors: 'gambe_sup',
  calves: 'gambe_inf',
  neck: 'collo',
}

console.log('Scarico il dataset…')
const res = await fetch(SRC)
if (!res.ok) throw new Error(`Download fallito: HTTP ${res.status}`)
const raw = await res.json()
console.log(`${raw.length} esercizi scaricati`)

const unmapped = new Set()

const catalog = raw.map((e) => {
  let category
  if (e.category === 'cardio') {
    category = 'cardio'
  } else {
    const m = (e.primaryMuscles || [])[0]
    category = MUSCLE_TO_CAT[m]
    if (!category) {
      unmapped.add(m || '(nessun muscolo)')
      category = 'core'
    }
  }
  return {
    id: e.id,
    name: e.name,
    category,
    equipment: e.equipment || null,
    level: e.level || null,
    muscles: e.primaryMuscles || [],
    secondary: e.secondaryMuscles || [],
    instructions: (e.instructions || []).join(' '),
    image: e.images?.[0] ? IMG_BASE + e.images[0] : null,
  }
})

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(catalog))

const counts = {}
for (const c of catalog) counts[c.category] = (counts[c.category] || 0) + 1
console.log('Catalogo generato:', OUT)
console.table(counts)
if (unmapped.size) console.warn('⚠️ Muscoli non mappati (finiti in core):', [...unmapped])
