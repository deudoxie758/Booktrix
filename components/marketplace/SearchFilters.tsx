type Props = {
  values: { q?: string; category?: string; district?: string }
  categories: string[]
}

const districts = ['', 'Castries', 'Gros Islet', 'Soufrière', 'Vieux Fort', 'Dennery', 'Micoud', 'Laborie', 'Choiseul', 'Anse la Raye', 'Canaries']

export function SearchFilters({ values, categories }: Props) {
  return <form role="search" action="/search" className="grid gap-4 rounded-3xl border border-sand-200 bg-white p-5 shadow-soft md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end">
    <label className="text-sm font-semibold text-cocoa-800">Search services
      <input name="q" defaultValue={values.q} placeholder="Massage, nails, tutoring…" className="mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-cream-50 px-4 text-cocoa-950 outline-none focus:ring-2 focus:ring-clay-500" />
    </label>
    <label className="text-sm font-semibold text-cocoa-800">Category
      <select name="category" defaultValue={values.category ?? ''} className="mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-cream-50 px-4 text-cocoa-950"><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
    </label>
    <label className="text-sm font-semibold text-cocoa-800">Saint Lucian location
      <select name="district" defaultValue={values.district ?? ''} className="mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-cream-50 px-4 text-cocoa-950">{districts.map((district) => <option key={district} value={district}>{district || 'Anywhere'}</option>)}</select>
    </label>
    <button className="min-h-11 rounded-full bg-cocoa-900 px-6 text-sm font-semibold text-white">Search</button>
  </form>
}
