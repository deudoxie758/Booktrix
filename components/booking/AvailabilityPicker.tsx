type Slot = { start: string; segments: Array<Record<string, unknown>> }

type Props = {
  slots: Slot[]
  availableDates: string[]
  loadingDates: boolean
  loading: boolean
  reserving: boolean
  onDate: (value: string) => void
  onSelect: (slot: Slot) => void
}

const displayDate = (date: string) => new Intl.DateTimeFormat('en-LC', {
  weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${date}T12:00:00.000Z`))

export function AvailabilityPicker({ slots, availableDates, loadingDates, loading, reserving, onDate, onSelect }: Props) {
  const time = (value: string) => new Intl.DateTimeFormat('en-LC', { timeZone: 'America/St_Lucia', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-semibold text-cocoa-900">Date
      <select aria-label="Date" aria-describedby="available-date-help" defaultValue="" disabled={reserving || loadingDates || !availableDates.length} onChange={(event) => onDate(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-sand-300 bg-white px-4 disabled:opacity-60">
        <option value="" disabled>{loadingDates ? 'Checking available dates…' : availableDates.length ? 'Choose an available date' : 'No available dates'}</option>
        {availableDates.map((date) => <option key={date} value={date}>{displayDate(date)}</option>)}
      </select>
      <span id="available-date-help" className="mt-2 block text-xs font-normal text-cocoa-600">Only dates with a complete available appointment are shown.</span>
    </label>
    <fieldset>
      <legend className="text-sm font-semibold text-cocoa-900">Available time</legend>
      {loading ? <p role="status" className="mt-2 rounded-2xl bg-sand-100 p-4 text-sm text-cocoa-600">Finding available times…</p> : slots.length ? <>
        {reserving && <p role="status" className="mt-2 rounded-2xl bg-sand-100 p-4 text-sm text-cocoa-600">Reserving your time…</p>}
        <div className="mt-2 grid grid-cols-2 gap-2">{slots.map((slot) => <button key={slot.start} type="button" disabled={reserving} onClick={() => onSelect(slot)} className="min-h-11 rounded-full border border-clay-300 bg-white text-sm font-semibold text-cocoa-800 disabled:opacity-60">{time(slot.start)}</button>)}</div>
      </> : <p className="mt-2 rounded-2xl bg-sand-100 p-4 text-sm text-cocoa-600">Choose a date to see live availability.</p>}
    </fieldset>
  </div>
}
