export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const token = request.headers.get('authorization')?.split(' ')[1] || ''

    const response = await fetch(`${backendUrl}/api/pipeline/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return Response.json({
        total: 0,
        prospection: 0,
        negotiation: 0,
        conclusion: 0,
        lost: 0,
      })
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Pipeline stats error:', error)
    return Response.json({
      total: 0,
      prospection: 0,
      negotiation: 0,
      conclusion: 0,
      lost: 0,
    })
  }
}
