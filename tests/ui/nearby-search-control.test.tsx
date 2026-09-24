import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NearbySearchControl } from '@/components/marketplace/NearbySearchControl'

const setGeolocation = (value: Geolocation | undefined) => {
  Object.defineProperty(window.navigator, 'geolocation', { configurable: true, value })
}

describe('NearbySearchControl', () => {
  afterEach(() => {
    setGeolocation(undefined)
    vi.restoreAllMocks()
  })

  it('does not request device location until the customer clicks', () => {
    const getCurrentPosition = vi.fn()
    setGeolocation({ getCurrentPosition } as unknown as Geolocation)

    render(<NearbySearchControl values={{}} />)

    expect(getCurrentPosition).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }))
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('preserves manual filters and navigates with the successful coordinates', async () => {
    const navigate = vi.fn()
    setGeolocation({
      getCurrentPosition: (success: PositionCallback) => success({
        coords: { latitude: 14.0101, longitude: -60.9875 },
      } as GeolocationPosition),
    } as unknown as Geolocation)

    render(<NearbySearchControl values={{ q: 'massage', category: 'Wellness', district: 'Castries' }} navigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }))

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    const url = new URL(navigate.mock.calls[0][0], 'https://booktrx.test')
    expect(url.pathname).toBe('/search')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'massage', category: 'Wellness', district: 'Castries', latitude: '14.0101', longitude: '-60.9875',
    })
  })

  it.each([
    [1, 'Location permission was denied'],
    [2, 'Your location is currently unavailable'],
    [3, 'Finding your location timed out'],
  ])('announces geolocation error code %s while keeping manual search available', async (code, message) => {
    setGeolocation({
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code } as GeolocationPositionError),
    } as unknown as Geolocation)

    render(<><button>Search</button><NearbySearchControl values={{}} /></>)
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: /^search$/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /use my location/i })).toBeEnabled()
  })

  it('explains when device location is unsupported', async () => {
    setGeolocation(undefined)
    render(<NearbySearchControl values={{}} />)

    fireEvent.click(screen.getByRole('button', { name: /use my location/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Location services are not supported by this browser')
  })

  it('shows active nearby search and a filter-preserving clear link', () => {
    render(<NearbySearchControl values={{ q: 'nails', category: 'Beauty', latitude: '14', longitude: '-61' }} />)

    expect(screen.getByText(/sorted by distance/i)).toBeInTheDocument()
    const clear = screen.getByRole('link', { name: /clear location/i })
    expect(clear).toHaveAttribute('href', '/search?q=nails&category=Beauty')
  })
})
