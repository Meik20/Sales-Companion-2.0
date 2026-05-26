import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get('data')

  if (!data) {
    return new NextResponse('Missing data parameter', { status: 400 })
  }

  try {
    const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      data
    )}`
    
    const response = await fetch(qrServerUrl)

    if (!response.ok) {
      return new NextResponse('Failed to generate QR Code from upstream', { status: 500 })
    }

    const blob = await response.blob()
    const headers = new Headers()
    headers.set('Content-Type', 'image/png')
    headers.set('Cache-Control', 'public, max-age=86400')
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin')

    return new NextResponse(blob, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('QR proxy error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
