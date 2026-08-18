import type { ReactNode } from 'react'

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
	const styles = { neutral: 'bg-sand-100 text-cocoa-700', success: 'bg-emerald-50 text-emerald-800', warning: 'bg-amber-50 text-amber-800', danger: 'bg-red-50 text-red-800' }
	return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone]}`}>{children}</span>
}
