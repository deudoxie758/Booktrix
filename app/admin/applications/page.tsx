import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requirePlatformAdmin } from '@/modules/organizations/access'

export default async function ApplicationsPage() {
	await requirePlatformAdmin()
	const applications = await prisma.businessApplication.findMany({ include: { business: true, applicant: true }, orderBy: { createdAt: 'desc' } })
	return <main className="px-5 py-12 sm:px-8"><div className="mx-auto max-w-6xl"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-clay-600">Platform administration</p><h1 className="mt-3 font-display text-4xl">Business applications</h1></div><Link href="/admin" className="text-sm font-semibold">Admin home</Link></div><div className="mt-8 overflow-hidden rounded-3xl border border-sand-200 bg-white">{applications.length ? applications.map((item) => <Link key={item.id} href={`/admin/applications/${item.id}`} className="flex flex-col gap-2 border-b border-sand-200 p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{item.business.name}</h2><p className="text-sm text-cocoa-600">{item.industry} · {item.applicant.email}</p></div><span className="text-xs font-bold uppercase tracking-wider text-clay-600">{item.status.replace('_',' ')}</span></Link>) : <p className="p-8 text-center text-cocoa-600">No business applications yet.</p>}</div></div></main>
}
