import { z } from 'zod'

export const LOCATION_TIMEZONE = 'America/St_Lucia'

export type LocationValuesInput = {
  name: string
  slug: string
  address: string
  phone?: string | null
  email?: string | null
  isActive?: boolean
}

export type NormalizedLocationValues = {
  name: string
  slug: string
  address: string
  phone: string | null
  email: string | null
  timezone: typeof LOCATION_TIMEZONE
  isActive: boolean
}

export type LocationHoursInput = {
  weekday: number
  closed: boolean
  opensAt: string
  closesAt: string
}

export type NormalizedLocationHour = {
  weekday: number
  startMinute: number
  endMinute: number
}

export type ValidationSuccess<T> = { ok: true; data: T }
export type ValidationFailure = { ok: false; error: string; fieldErrors: Record<string, string> }

export function normalizeLocationSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const locationValuesSchema = z.object({
  name: z.string().trim().min(1, 'Location name is required.').max(120, 'Location name must be 120 characters or fewer.'),
  slug: z.string().transform(normalizeLocationSlug).pipe(z.string().min(1, 'Slug is required.').max(120, 'Slug must be 120 characters or fewer.')),
  address: z.string().trim().min(1, 'Address is required.').max(240, 'Address must be 240 characters or fewer.'),
  phone: z.string().trim().max(30, 'Phone must be 30 characters or fewer.').optional().nullable().transform((value) => value || null),
  email: z.string().trim().max(254, 'Email must be 254 characters or fewer.').optional().nullable().transform((value, context) => {
    if (!value) return null
    if (!z.string().email().safeParse(value).success) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email address.' })
      return z.NEVER
    }
    return value.toLowerCase()
  }),
  isActive: z.boolean().optional().default(true),
})

function zodFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export function parseLocationValues(input: LocationValuesInput): ValidationSuccess<NormalizedLocationValues> | ValidationFailure {
  const parsed = locationValuesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Please correct the highlighted fields.', fieldErrors: zodFieldErrors(parsed.error) }
  return {
    ok: true,
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email,
      isActive: parsed.data.isActive,
      timezone: LOCATION_TIMEZONE,
    } as NormalizedLocationValues,
  }
}

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function minuteOfDay(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

export function parseLocationHours(input: LocationHoursInput[]): ValidationSuccess<NormalizedLocationHour[]> | ValidationFailure {
  const weekdays = input.map(({ weekday }) => weekday)
  if (input.length !== 7 || new Set(weekdays).size !== 7 || weekdays.some((weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
    return { ok: false, error: 'Enter opening hours for all seven days.', fieldErrors: { hours: 'Each weekday must appear exactly once.' } }
  }

  const hours: NormalizedLocationHour[] = []
  const fieldErrors: Record<string, string> = {}
  for (const row of input) {
    if (row.closed) continue
    if (!timePattern.test(row.opensAt)) fieldErrors[`hours.${row.weekday}.opensAt`] = 'Use a valid 24-hour time.'
    if (!timePattern.test(row.closesAt)) fieldErrors[`hours.${row.weekday}.closesAt`] = 'Use a valid 24-hour time.'
    if (fieldErrors[`hours.${row.weekday}.opensAt`] || fieldErrors[`hours.${row.weekday}.closesAt`]) continue
    const startMinute = minuteOfDay(row.opensAt)
    const endMinute = minuteOfDay(row.closesAt)
    if (endMinute <= startMinute) {
      fieldErrors[`hours.${row.weekday}.closesAt`] = 'Closing time must be after opening time.'
      continue
    }
    hours.push({ weekday: row.weekday, startMinute, endMinute })
  }

  if (Object.keys(fieldErrors).length) return { ok: false, error: 'Please correct the highlighted hours.', fieldErrors }
  return { ok: true, data: hours.sort((left, right) => left.weekday - right.weekday) }
}
