import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'This legacy endpoint has been retired. Use the Booktrx marketplace search.' },
    { status: 410 },
  )
}
