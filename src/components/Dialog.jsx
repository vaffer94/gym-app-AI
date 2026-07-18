import { useState } from 'react'

/** Dialoghi con la grafica dell'app (mai popup nativi del browser) */

function Backdrop({ children, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="sheet" style={{ maxWidth: 380 }}>{children}</div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Conferma', cancelLabel = 'Annulla', danger = false, onConfirm, onCancel }) {
  return (
    <Backdrop onClose={onCancel}>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      <div className="row">
        <button className="btn" style={{ flex: 1 }} onClick={onCancel}>{cancelLabel}</button>
        <button
          className={`btn ${danger ? '' : 'btn--primary'}`}
          style={danger ? { flex: 1, background: 'var(--danger)', color: '#fff' } : { flex: 1 }}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Backdrop>
  )
}

export function AlertDialog({ title = 'Ops!', message, onClose }) {
  return (
    <Backdrop onClose={onClose}>
      <h2>{title}</h2>
      <p>{message}</p>
      <button className="btn btn--primary btn--big" onClick={onClose}>Ok</button>
    </Backdrop>
  )
}

export function PromptDialog({ title, initial = '', placeholder = '', confirmLabel = 'Conferma', onConfirm, onCancel }) {
  const [text, setText] = useState(initial)
  return (
    <Backdrop onClose={onCancel}>
      <h2>{title}</h2>
      <input
        className="input"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && text.trim() && onConfirm(text.trim())}
        autoFocus
      />
      <div className="row">
        <button className="btn" style={{ flex: 1 }} onClick={onCancel}>Annulla</button>
        <button className="btn btn--primary" style={{ flex: 1 }} disabled={!text.trim()} onClick={() => onConfirm(text.trim())}>
          {confirmLabel}
        </button>
      </div>
    </Backdrop>
  )
}
