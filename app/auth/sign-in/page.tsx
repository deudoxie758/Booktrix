import { AuthShell } from '@/app/auth/components/AuthShell'
import { SignInForm } from '@/app/auth/components/SignInForm'

export default function SignInPage() {
	return <AuthShell
		eyebrow="Welcome back"
		title="Sign in to Booktrix"
		description="Return to your bookings, schedule, or business workspace."
		asideTitle="Everything you need, in one place."
		asideDescription="Manage appointments, discover trusted local services, and keep every visit connected to your account."
	>
		<SignInForm googleEnabled={googleAuthIsConfigured()} />
	</AuthShell>
}

function googleAuthIsConfigured() {
	return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())
}
