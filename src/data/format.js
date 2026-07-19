/** Etichetta target di un esercizio in scheda: "3×12 · 10 kg" oppure "20 min" */
export function formatEntryTarget(e) {
  if (e.mode === 'duration') return `${Math.round((e.durationSec || 0) / 60)} min`
  return `${e.sets}×${e.reps}${e.hasWeight ? ` · ${e.weightKg} kg` : ''}`
}
