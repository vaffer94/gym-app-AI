import { useEffect, useState } from 'react'

/** Campo numerico: +/- oppure inserimento diretto da tastiera */
export default function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix = '' }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const clamp = (v) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))

  const commit = () => {
    const n = parseFloat(text.replace(',', '.'))
    if (Number.isNaN(n)) setText(String(value))
    else onChange(clamp(n))
  }

  return (
    <div className="stepper">
      <button type="button" className="btn btn--sm" onClick={() => onChange(clamp(value - step))}>−</button>
      <span className="value">
        <input
          className="value-input"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          onFocus={(e) => e.target.select()}
        />
        {suffix && <span className="small muted">{suffix}</span>}
      </span>
      <button type="button" className="btn btn--sm" onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  )
}
