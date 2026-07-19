import { useEffect, useState } from 'react'

/** Campo numerico: +/- oppure inserimento diretto da tastiera */
export default function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix = '' }) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)
  // sincronizza col valore esterno SOLO quando non stai scrivendo,
  // altrimenti un re-render ti cambia il numero sotto le dita
  useEffect(() => {
    if (!focused) setText(String(value))
  }, [value, focused])

  const clamp = (v) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))

  const commit = () => {
    const n = parseFloat(text.replace(',', '.'))
    if (Number.isNaN(n)) setText(String(value))
    else onChange(clamp(n))
  }

  return (
    <div className="stepper">
      <button type="button" className="btn btn--sm" onClick={() => onChange(clamp(value - step))}><i className="fa-solid fa-minus" /></button>
      <span className="value">
        <input
          className="value-input"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setFocused(false); commit() }}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          onFocus={(e) => { setFocused(true); e.target.select() }}
        />
        {suffix && <span className="small muted">{suffix}</span>}
      </span>
      <button type="button" className="btn btn--sm" onClick={() => onChange(clamp(value + step))}><i className="fa-solid fa-plus" /></button>
    </div>
  )
}
