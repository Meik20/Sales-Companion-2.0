export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    const body = await request.json()

    const response = await fetch(`${backendUrl}/api/team/activate-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      return Response.json(error, { status: response.status })
    }

    const data = await response.json()
    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error('Team activation error:', error)
    return Response.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
