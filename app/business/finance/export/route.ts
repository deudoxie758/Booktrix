import { NextResponse } from 'next/server'
import { createFinanceCsv, loadFinanceLedger } from '@/modules/finance/ledger'
import { requireActor } from '@/modules/identity/session'

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : ''
}

function statusForError(code: string) {
  if (code === 'AUTHENTICATION_REQUIRED') return 401
  if (code === 'FINANCE_ACCESS_DENIED' || code === 'BUSINESS_ACCESS_DENIED') return 403
  if (code.startsWith('FINANCE_FILTER') || code === 'FINANCE_LOCATION_DENIED') return 400
  return 500
}

// This route re-derives authentication and authorization from the session on
// every request. It never trusts a client-supplied businessId or authorized
// location list from the query string: loadFinanceLedger resolves the
// actor's business and authorized locations server-side, and the only
// query-string scope value (locationId) is validated against that
// server-resolved authorized list before it can narrow the export.
export async function GET(request: Request) {
  let actorId: string
  try {
    const actor = await requireActor()
    actorId = actor.id
  } catch (error) {
    return NextResponse.json({ error: errorCode(error) || 'AUTHENTICATION_REQUIRED' }, { status: 401 })
  }

  const url = new URL(request.url)
  const rawFilters = {
    fromDate: url.searchParams.get('fromDate'),
    toDate: url.searchParams.get('toDate'),
    locationId: url.searchParams.get('locationId'),
    status: url.searchParams.get('status'),
    paymentState: url.searchParams.get('paymentState'),
  }

  try {
    const model = await loadFinanceLedger({ actorId, rawFilters, unpaged: true })
    const csv = createFinanceCsv(model)
    const filename = `finance-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    const code = errorCode(error)
    return NextResponse.json({ error: code || 'FINANCE_EXPORT_FAILED' }, { status: statusForError(code) })
  }
}
