export async function PATCH(
  request: Request,
  { params }: { params: { uid: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''
    const body = await request.json()

    const response = await fetch(`${backendUrl}/api/admin/users/${params.uid}`, {
      method: 'PATCH',
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
    console.error('Update user error:', error)
    return Response.json(
      { error: 'Erreur interne' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { uid: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''

    const response = await fetch(`${backendUrl}/api/admin/users/${params.uid}`, {
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
    console.error('Delete user error:', error)
    return Response.json(
      { error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
