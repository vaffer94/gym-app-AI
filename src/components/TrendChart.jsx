import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

// Stile coerente col design cartoon
Chart.defaults.font.family = "'Nunito', system-ui, sans-serif"
Chart.defaults.font.weight = 700
Chart.defaults.color = '#2b2b3c'
Chart.defaults.borderColor = 'rgba(43, 43, 60, 0.15)'

/** Wrapper leggero per Chart.js */
export default function TrendChart({ type, labels, datasets, yLabel }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
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
  }, [type, labels, datasets, yLabel])

  return (
    <div style={{ height: 220 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
