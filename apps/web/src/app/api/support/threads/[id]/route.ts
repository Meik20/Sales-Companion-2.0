export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''

    const response = await fetch(`${backendUrl}/api/support/threads/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return Response.json(
        { error: 'Non trouvé' },
        { status: 404 }
      )
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Support thread detail error:', error)
    return Response.json(
      { error: 'Erreur interne' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''
    const body = await request.json()

    const response = await fetch(`${backendUrl}/api/support/threads/${id}/messages`, {
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
    console.error('Reply support thread error:', error)
    return Response.json(
      { error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
