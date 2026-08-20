import { NextResponse } from 'next/server'

export async function POST() {
	return NextResponse.json(
		{ error: 'This booking endpoint has been retired. Use /api/bookings.' },
		{ status: 410 },
	)
}
