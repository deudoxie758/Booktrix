import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; help?: string }

export function Field({ label, error, help, id, className = '', ...props }: Props) {
	const inputId = id ?? props.name
	const helpId = help ? `${inputId}-help` : undefined
	const errorId = error ? `${inputId}-error` : undefined
	return <div className="space-y-2">
		<label className="block text-sm font-semibold text-cocoa-900" htmlFor={inputId}>{label}</label>
		<input id={inputId} aria-invalid={Boolean(error)} aria-describedby={errorId ?? helpId} className={`min-h-12 w-full rounded-2xl border bg-white px-4 text-cocoa-950 outline-none transition placeholder:text-cocoa-400 focus:border-clay-500 focus:ring-4 focus:ring-clay-100 ${error ? 'border-danger' : 'border-sand-300'} ${className}`} {...props} />
		{help && !error ? <p id={helpId} className="text-sm text-cocoa-600">{help}</p> : null}
		{error ? <p id={errorId} className="text-sm font-medium text-danger">{error}</p> : null}
	</div>
}
