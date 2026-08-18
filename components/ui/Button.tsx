import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }

export function Button({ className = '', variant = 'primary', ...props }: Props) {
	const styles = {
		primary: 'bg-cocoa-900 text-cream-50 hover:bg-cocoa-800 shadow-soft',
		secondary: 'bg-clay-100 text-cocoa-900 hover:bg-clay-200',
		ghost: 'bg-transparent text-cocoa-800 hover:bg-sand-100',
	}
	return <button className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${styles[variant]} ${className}`} {...props} />
}
