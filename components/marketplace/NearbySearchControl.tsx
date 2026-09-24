'use client'

import Link from 'next/link'
import { useState } from 'react'

type SearchValues = {
  q?: string
  category?: string
  district?: string
  latitude?: string
  longitude?: string
}

type Props = {
  values: SearchValues
  navigate?: (href: string) => void
}

const searchUrl = (values: SearchValues, coordinates?: { latitude: number; longitude: number }) => {
  const params = new URLSearchParams()
  for (const key of ['q', 'category', 'district'] as const) {
    if (values[key]) params.set(key, values[key])
  }
  if (coordinates) {
    params.set('latitude', String(coordinates.latitude))
    params.set('longitude', String(coordinates.longitude))
  }
  const query = params.toString()
  return query ? `/search?${query}` : '/search'
}

const errorMessage = (code: number) => {
  if (code === 1) return 'Location permission was denied. You can still search manually.'
  if (code === 2) return 'Your location is currently unavailable. You can still search manually.'
  if (code === 3) return 'Finding your location timed out. You can still search manually.'
  return 'Your location could not be found. You can still search manually.'
}

export function NearbySearchControl({ values, navigate }: Props) {
  const [message, setMessage] = useState('')
  const [locating, setLocating] = useState(false)
  const locationActive = Boolean(values.latitude && values.longitude)

  const locate = () => {
    if (!navigator.geolocation) {
      setMessage('Location services are not supported by this browser. You can still search manually.')
      return
    }

    setLocating(true)
    setMessage('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const destination = searchUrl(values, { latitude: coords.latitude, longitude: coords.longitude })
        setLocating(false)
        if (navigate) navigate(destination)
        else window.location.assign(destination)
      },
      (error) => {
        setLocating(false)
        setMessage(errorMessage(error.code))
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  if (locationActive) {
    return <div className="flex flex-wrap items-center gap-3 text-sm text-cocoa-700">
      <span role="status" className="rounded-full bg-sage-100 px-4 py-2 font-semibold text-cocoa-900">Sorted by distance from your device</span>
      <Link href={searchUrl(values)} className="font-semibold text-clay-700 underline underline-offset-4">Clear location</Link>
    </div>
  }

  return <div className="flex flex-wrap items-center gap-3">
    <button type="button" onClick={locate} disabled={locating} className="min-h-11 rounded-full border border-cocoa-300 bg-white px-5 text-sm font-semibold text-cocoa-900 transition hover:border-cocoa-600 disabled:cursor-wait disabled:opacity-60">
      {locating ? 'Finding your location…' : 'Use my location'}
    </button>
    {message ? <p role="status" className="text-sm text-cocoa-700">{message}</p> : <p className="text-sm text-cocoa-600">See the closest available businesses first.</p>}
  </div>
}
