export async function GET(request: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''

    const response = await fetch(`${backendUrl}/api/team/assignments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return Response.json([])
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Team assignments error:', error)
    return Response.json([])
  }
}

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''
    const body = await request.json()

    const response = await fetch(`${backendUrl}/api/team/assignments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return Response.json(
        { error: 'Erreur serveur' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Create assignment error:', error)
    return Response.json(
      { error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
