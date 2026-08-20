type Schedule = {
	id: string
	weekday: number
	startMinute: number
	endMinute: number
	location: { name: string }
}

type TimeOff = {
	id: string
	startsAt: Date
	endsAt: Date
	reason: string | null
	location: { name: string }
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function StaffScheduleReadOnly({ schedules, timeOff }: { schedules: Schedule[]; timeOff: TimeOff[] }) {
	return <div className="space-y-8">
		<section className="rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
			<p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Availability</p>
			<h2 className="mt-1 font-display text-2xl text-cocoa-950">My recurring hours</h2>
			{schedules.length ? <ul className="mt-5 divide-y divide-sand-100">{schedules.map((schedule) => <li key={schedule.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold text-cocoa-950">{weekdays[schedule.weekday]} · {schedule.location.name}</span><span className="text-cocoa-600">{formatMinutes(schedule.startMinute)}–{formatMinutes(schedule.endMinute)}</span></li>)}</ul> : <p className="mt-4 text-sm text-cocoa-600">No recurring hours are scheduled yet.</p>}
		</section>
		<section className="rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
			<p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Exceptions</p>
			<h2 className="mt-1 font-display text-2xl text-cocoa-950">My time off</h2>
			{timeOff.length ? <ul className="mt-5 divide-y divide-sand-100">{timeOff.map((entry) => <li key={entry.id} className="py-3 text-sm"><p className="font-semibold text-cocoa-950">{entry.location.name} · {entry.startsAt.toLocaleDateString('en-CA')} to {entry.endsAt.toLocaleDateString('en-CA')}</p>{entry.reason ? <p className="mt-1 text-cocoa-600">{entry.reason}</p> : null}</li>)}</ul> : <p className="mt-4 text-sm text-cocoa-600">No time off is recorded.</p>}
		</section>
	</div>
}

function formatMinutes(minutes: number) {
	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
