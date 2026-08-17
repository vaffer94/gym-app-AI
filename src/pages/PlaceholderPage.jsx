import { useNavigate } from 'react-router-dom'
import Icona from '../icons'

export default function PlaceholderPage({ icona, title, text }) {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home">
          <Icona nome="indietro" />
        </button>
        <h2>{title}</h2>
      </header>
      <div className="card center stack" style={{ padding: '40px 20px' }}>
        <Icona nome={icona} size="2.4rem" />
        <p className="muted">{text}</p>
      </div>
    </div>
  )
}
