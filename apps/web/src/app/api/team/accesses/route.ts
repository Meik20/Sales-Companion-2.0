import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'

  console.log('[team/accesses] backendUrl:', backendUrl)

  try {
    const token = request.headers.get('authorization')?.split(' ')[1] || ''
    const body = await request.json()

    console.log('[team/accesses] body:', JSON.stringify(body))

    const url = `${backendUrl}/api/team/accesses`
    console.log('[team/accesses] fetching:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    console.log('[team/accesses] response status:', response.status)

    const data = await response.json()
    console.log('[team/accesses] response data:', JSON.stringify(data))

    return NextResponse.json(data, { status: response.status })
  } catch (error: unknown) {
    const err = error as Error
    console.error('[team/accesses] ERREUR:', err.message, err.stack)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}