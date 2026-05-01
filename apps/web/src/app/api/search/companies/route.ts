export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sector = searchParams.get('sector')
    const region = searchParams.get('region')
    const city = searchParams.get('city')
    const query = searchParams.get('query')

    // Build query string for backend
    const params = new URLSearchParams()
    if (sector) params.append('sector', sector)
    if (region) params.append('region', region)
    if (city) params.append('city', city)
    if (query) params.append('query', query)

    // Forward request to backend server
    const backendUrl = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/api/search/companies?${params}`, {
      headers: {
        'Authorization': `Bearer ${request.headers.get('authorization')?.split(' ')[1] || ''}`,
      },
    })

    if (!response.ok) {
      // If backend fails, return empty array for now
      return Response.json([])
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Search error:', error)
    return Response.json([])
  }
}
