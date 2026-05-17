import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''
    const body = await request.json()

    const response = await fetch(`${backendUrl}/api/team/accesses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Create team access error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
