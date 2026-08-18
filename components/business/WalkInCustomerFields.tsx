export function WalkInCustomerFields() {
  return <div className="grid gap-4 rounded-2xl bg-cream-100 p-4 sm:grid-cols-2">
    <label className="text-sm font-semibold text-cocoa-800">Customer name<input required name="customerName" className="mt-1 w-full rounded-xl border border-sand-300 bg-white px-3 py-2" /></label>
    <label className="text-sm font-semibold text-cocoa-800">Phone<input name="customerPhone" type="tel" className="mt-1 w-full rounded-xl border border-sand-300 bg-white px-3 py-2" /></label>
    <label className="text-sm font-semibold text-cocoa-800 sm:col-span-2">Email<input name="customerEmail" type="email" className="mt-1 w-full rounded-xl border border-sand-300 bg-white px-3 py-2" /></label>
  </div>
}
