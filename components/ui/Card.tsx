import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={`rounded-3xl border border-sand-200 bg-white shadow-soft ${className}`} {...props} />
}
