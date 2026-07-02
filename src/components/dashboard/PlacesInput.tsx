"use client"

import { useState, useRef, useCallback } from "react"

type Prediction = { description: string; place_id: string }

export default function PlacesInput({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPredictions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setPredictions([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places-autocomplete?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.predictions?.length > 0) {
          setPredictions(data.predictions)
          setOpen(true)
        } else {
          setPredictions([])
          setOpen(false)
        }
      } catch {
        setPredictions([])
      }
    }, 280)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    fetchPredictions(v)
  }

  function select(description: string) {
    onChange(description)
    setPredictions([])
    setOpen(false)
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => { if (predictions.length > 0) setOpen(true) }}
        placeholder={placeholder ?? "123 Main St, City, State"}
        autoComplete="off"
        style={style}
      />
      {open && predictions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          backgroundColor: "#1A1F1B", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {predictions.map((p, i) => (
            <button
              key={p.place_id}
              onMouseDown={() => select(p.description)}
              style={{
                width: "100%", padding: "11px 14px", background: "none", border: "none",
                borderBottom: i < predictions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                textAlign: "left", cursor: "pointer", color: "white", fontSize: 13,
                fontWeight: 500, lineHeight: 1.4,
              }}
            >
              {p.description}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
