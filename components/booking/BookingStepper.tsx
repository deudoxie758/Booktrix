const labels = ['Services', 'Location & professional', 'Date & time', 'Customer details', 'Payment', 'Review']

export function BookingStepper({ current }: { current: number }) {
  return <nav aria-label="Booking progress"><ol className="flex gap-2 overflow-x-auto pb-2">{labels.map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${index === current ? 'bg-cocoa-900 text-white' : 'bg-sand-100 text-cocoa-600'}`}>{label}</li>)}</ol></nav>
}
