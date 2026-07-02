"use client"

import { useEffect, useRef } from "react"

type GPlace = { formatted_address?: string }
type GAutocomplete = {
  getPlace: () => GPlace
  addListener: (event: string, fn: () => void) => void
}
type GMaps = {
  maps: {
    places: {
      Autocomplete: new (
        el: HTMLInputElement,
        opts: { types: string[]; componentRestrictions: { country: string }; fields: string[] }
      ) => GAutocomplete
    }
  }
}

declare global {
  interface Window {
    google?: GMaps
    initGoogleMaps?: () => void
  }
}

let scriptLoaded = false
let scriptLoading = false
const onLoadCallbacks: (() => void)[] = []

function loadGoogleMapsScript(apiKey: string, onLoad: () => void) {
  if (typeof window === "undefined") return
  if (scriptLoaded) { onLoad(); return }
  onLoadCallbacks.push(onLoad)
  if (scriptLoading) return
  scriptLoading = true
  window.initGoogleMaps = () => {
    scriptLoaded = true
    onLoadCallbacks.forEach(fn => fn())
    onLoadCallbacks.length = 0
  }
  const script = document.createElement("script")
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps&loading=async`
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

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
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<GAutocomplete | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

  useEffect(() => {
    if (!apiKey || !inputRef.current) return

    function initAutocomplete() {
      if (!inputRef.current || autocompleteRef.current || !window.google) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["address"],
        componentRestrictions: { country: "us" },
        fields: ["formatted_address"],
      })
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace()
        if (place?.formatted_address) onChange(place.formatted_address)
      })
    }

    loadGoogleMapsScript(apiKey, initAutocomplete)
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? "123 Main St, City, State"}
      autoComplete="off"
      style={style}
    />
  )
}
