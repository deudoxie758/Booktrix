import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json(
    { error: 'Standalone point redemption has been retired. Points can only be applied during a supported booking checkout.' },
    { status: 410 },
  )
}
