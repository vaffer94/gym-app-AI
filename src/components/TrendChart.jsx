import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { colore, useTemaAttivo } from '../lib/tema'

// Stile coerente col design cartoon
Chart.defaults.font.family = "'Nunito', system-ui, sans-serif"
Chart.defaults.font.weight = 700

/** Wrapper leggero per Chart.js */
export default function TrendChart({ type, labels, datasets, yLabel }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  // Chart.js dipinge su canvas e non legge il CSS: i colori vanno letti dalle
  // variabili e passati a mano, e il grafico va rifatto a ogni cambio di tema.
  // Prima erano fissi al caricamento del modulo, e sul tema scuro le scritte
  // restavano nere su fondo blu, cioe' invisibili.
  const tema = useTemaAttivo()

  useEffect(() => {
    Chart.defaults.color = colore('--ink')
    // La griglia e' lo stesso inchiostro molto trasparente: color-mix la
    // ricava dal token invece di ripetere il colore a mano.
    Chart.defaults.borderColor = `color-mix(in srgb, ${colore('--ink')} 18%, transparent)`
    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: datasets.length > 1 } },
        scales: {
          y: {
            beginAtZero: true,
            title: yLabel ? { display: true, text: yLabel } : undefined,
            ticks: { precision: 0 },
          },
          x: { grid: { display: false } },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [type, labels, datasets, yLabel, tema])

  return (
    <div style={{ height: 220 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
