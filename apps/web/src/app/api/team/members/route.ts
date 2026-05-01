export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''

    const response = await fetch(`${backendUrl}/api/team/members`, {
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
    console.error('Team members error:', error)
    return Response.json([])
  }
}
