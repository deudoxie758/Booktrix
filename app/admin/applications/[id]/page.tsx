import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requirePlatformAdmin } from '@/modules/organizations/access'
import { reviewApplicationAction } from '../actions'

export default async function ApplicationReviewPage({ params }: { params: { id: string } }) {
	await requirePlatformAdmin()
	const application = await prisma.businessApplication.findUnique({ where: { id: params.id }, include: { business: true, applicant: true } })
	if (!application) notFound()
	const decided = ['APPROVED','REJECTED'].includes(application.status)
	return <main className="px-5 py-12"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-clay-600">Application review</p><h1 className="mt-3 font-display text-4xl">{application.business.name}</h1><dl className="mt-8 grid gap-5 rounded-3xl bg-white p-7 shadow-soft sm:grid-cols-2"><div><dt className="text-xs uppercase text-cocoa-500">Owner</dt><dd>{application.ownerName}</dd></div><div><dt className="text-xs uppercase text-cocoa-500">Contact</dt><dd>{application.email}<br />{application.phone}</dd></div><div><dt className="text-xs uppercase text-cocoa-500">Industry</dt><dd>{application.industry}</dd></div><div><dt className="text-xs uppercase text-cocoa-500">Address</dt><dd>{application.address}</dd></div><div className="sm:col-span-2"><dt className="text-xs uppercase text-cocoa-500">Services</dt><dd>{application.serviceSummary}</dd></div></dl>{decided ? <p className="mt-6 rounded-2xl bg-sand-100 p-5 font-semibold">Decision: {application.status}</p> : <form action={reviewApplicationAction} className="mt-7 space-y-4"><input type="hidden" name="applicationId" value={application.id} /><label className="block text-sm font-semibold">Decision note<textarea className="mt-2 min-h-28 w-full rounded-2xl border border-sand-300 p-4" name="note" required /></label><div className="flex gap-3"><button name="decision" value="APPROVED" className="rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white">Approve</button><button name="decision" value="REJECTED" className="rounded-full bg-red-50 px-6 py-3 text-sm font-semibold text-red-800">Reject</button></div></form>}</div></main>
}
