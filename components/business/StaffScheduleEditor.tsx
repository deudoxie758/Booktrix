type Option = { id: string; name: string }
const field = 'mt-1 w-full rounded-xl border border-sand-300 bg-white px-3 py-2'

export function StaffScheduleEditor({ locations, staff, action }: { locations: Option[]; staff: Option[]; action?: (formData: FormData) => void | Promise<void> }) {
  return <form action={action} className="space-y-5 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Availability</p><h2 className="mt-1 font-display text-2xl text-cocoa-950">Weekly staff hours</h2></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Select label="Professional" name="membershipId" options={staff} /><Select label="Location" name="locationId" options={locations} /><label className="text-sm font-semibold">Weekday<select required name="weekday" className={field}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label className="text-sm font-semibold">Start time<input required aria-label="Start time" name="startTime" type="time" className={field} /></label><label className="text-sm font-semibold">End time<input required aria-label="End time" name="endTime" type="time" className={field} /></label></div>
    <button className="rounded-full bg-cocoa-900 px-5 py-3 text-sm font-semibold text-white">Save weekly hours</button>
  </form>
}

function Select({ label, name, options }: { label: string; name: string; options: Option[] }) { return <label className="text-sm font-semibold">{label}<select required aria-label={label} name={name} className={field}><option value="">Choose {label.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label> }
