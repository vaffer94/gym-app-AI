import { useNavigate } from 'react-router-dom'

export default function PlaceholderPage({ emoji, title, text }) {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home">
          ←
        </button>
        <h2>{title}</h2>
      </header>
      <div className="card center stack" style={{ padding: '40px 20px' }}>
        <span className="emoji-xl">{emoji}</span>
        <p className="muted">{text}</p>
      </div>
    </div>
  )
}
