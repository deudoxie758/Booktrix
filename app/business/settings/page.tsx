import { BookingPolicyForm } from '@/components/business/BookingPolicyForm'
import { BusinessProfileForm } from '@/components/business/BusinessProfileForm'
import { PublicationSettings } from '@/components/business/PublicationSettings'
import { getIntegrationStagingStatus, loadBusinessPolicy } from '@/modules/settings/business-policy'
import { getPublicationReadiness } from '@/modules/settings/publication-readiness'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import { saveBusinessPolicyAction, saveBusinessProfileAction, setPublicationStatusAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const context = await requireWorkspaceRole(['OWNER'])
  const [policy, readiness] = await Promise.all([
    loadBusinessPolicy(context.business.id),
    getPublicationReadiness({ actorId: context.actor.id, businessId: context.business.id }),
  ])
  const integrationStatus = getIntegrationStagingStatus()

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Owner only</p>
        <h1 className="mt-2 font-display text-4xl text-cocoa-950">Business settings</h1>
        <p className="mt-2 max-w-3xl text-cocoa-600">Manage your public storefront identity, booking policy defaults, and marketplace publication readiness. Changes here never rewrite existing services or bookings.</p>
        <nav aria-label="Settings sections" className="mt-5 flex flex-wrap gap-2">
          <a href="#profile" className="rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-cocoa-800">Business profile</a>
          <a href="#policy" className="rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-cocoa-800">Booking policy</a>
          <a href="#publication" className="rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-cocoa-800">Publication</a>
        </nav>
      </header>

      <BusinessProfileForm
        profile={{ name: context.business.name, slug: context.business.slug, description: context.business.description ?? null, phone: context.business.phone ?? null, email: context.business.email ?? null }}
        action={saveBusinessProfileAction}
      />

      <BookingPolicyForm policy={policy} action={saveBusinessPolicyAction} />

      <PublicationSettings readiness={readiness} integrationStatus={integrationStatus} action={setPublicationStatusAction} />
    </div>
  )
}
