import { AuthShell } from '@/app/auth/components/AuthShell'
import { SignUpForm } from '@/app/auth/components/SignUpForm'

export default function SignUpPage() {
	return <AuthShell
		eyebrow="New to Booktrix"
		title="Create your Booktrix account"
		description="Book local services and keep your appointments beautifully organized."
		asideTitle="Your time belongs to you."
		asideDescription="One account gives you a clear view of upcoming visits, booking history, and any authorized business workspaces."
	>
		<SignUpForm googleEnabled={googleAuthIsConfigured()} />
	</AuthShell>
}

function googleAuthIsConfigured() {
	return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())
}
