export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''

    const response = await fetch(`${backendUrl}/api/saved-searches/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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
    console.error('Delete saved search error:', error)
    return Response.json(
      { error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
