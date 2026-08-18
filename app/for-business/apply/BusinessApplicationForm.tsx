type Props = { action?: (formData: FormData) => void | Promise<void> }

export function BusinessApplicationForm({ action }: Props) {
	const input = 'mt-2 min-h-12 w-full rounded-2xl border border-sand-300 bg-white px-4 outline-none focus:border-clay-500 focus:ring-4 focus:ring-clay-100'
	return <form action={action} className="grid gap-5 sm:grid-cols-2">
		<label className="text-sm font-semibold">Business name<input className={input} name="businessName" required /></label>
		<label className="text-sm font-semibold">Owner name<input className={input} name="ownerName" required /></label>
		<label className="text-sm font-semibold">Business email<input className={input} name="email" type="email" required /></label>
		<label className="text-sm font-semibold">Phone<input className={input} name="phone" type="tel" required /></label>
		<label className="text-sm font-semibold sm:col-span-2">Saint Lucia business address<input className={input} name="address" required /></label>
		<label className="text-sm font-semibold sm:col-span-2">Industry<input className={input} name="industry" placeholder="Beauty, consulting, home services…" required /></label>
		<label className="text-sm font-semibold sm:col-span-2">Services offered<textarea className={`${input} min-h-32 py-3`} name="serviceSummary" required minLength={20} /></label>
		<label className="flex items-start gap-3 text-sm text-cocoa-700 sm:col-span-2"><input className="mt-1 h-4 w-4 accent-cocoa-900" name="termsAccepted" type="checkbox" required />I accept the Booktrix platform terms and confirm these business details are accurate.</label>
		<button className="min-h-12 rounded-full bg-cocoa-900 px-6 font-semibold text-white sm:col-span-2" type="submit">Submit application</button>
	</form>
}
