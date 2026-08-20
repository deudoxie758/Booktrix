import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { getActor } from '@/modules/identity/session'
import { invitationAuthenticationUrls } from '@/modules/team/invitations'

const messages: Record<string, string> = {
  INVITATION_NOT_FOUND: 'This invitation link is invalid.',
  INVITATION_EXPIRED: 'This invitation has expired. Ask the business to resend it.',
  INVITATION_REVOKED: 'This invitation has been revoked.',
  INVITATION_ALREADY_ACCEPTED: 'This invitation has already been accepted.',
  INVITATION_EMAIL_MISMATCH: 'Sign in with the email address that received this invitation.',
  INVITATION_ALREADY_MEMBER: 'This account is already an active member of the business.',
  LAST_OWNER_PROTECTED: 'This invitation conflicts with protected owner access.',
}

export default async function InvitationPage({ params, searchParams }: { params: { token: string }; searchParams: { error?: string } }) {
  const token = params.token
  const actor = await getActor()
  const auth = invitationAuthenticationUrls(token)
  const error = searchParams.error ? messages[searchParams.error] ?? messages.INVITATION_NOT_FOUND : null

  return <main className="min-h-screen bg-cream-50 px-4 py-12 sm:px-6"><section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-soft sm:p-9">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Booktrix team access</p><h1 className="mt-2 font-display text-4xl text-cocoa-950">Accept your invitation</h1><p className="mt-3 text-cocoa-600">Invitation links are email-bound, expire after seven days, and can be used only once.</p></div>
    {error ? <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
    {!actor ? <div className="space-y-3"><p className="text-sm text-cocoa-700">Sign in with the invited email address. If you are new to Booktrix, create your account first; you will return here safely.</p><div className="flex flex-wrap gap-3"><Link href={auth.signIn} className="inline-flex min-h-11 items-center rounded-full bg-cocoa-900 px-5 py-2.5 text-sm font-semibold text-white">Sign in to accept</Link><Link href={auth.signUp} className="inline-flex min-h-11 items-center rounded-full border border-sand-300 px-5 py-2.5 text-sm font-semibold text-cocoa-900">Create an account</Link></div></div>
      : <form aria-label="Accept team invitation" action="/api/team-invitations/accept" method="post" className="space-y-4"><input type="hidden" name="token" value={token} /><p className="text-sm text-cocoa-700">Signed in as <strong>{actor.email}</strong>. Acceptance will fail safely if this is not the invited email.</p><Button type="submit">Accept invitation</Button></form>}
  </section></main>
}
