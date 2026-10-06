import { NextResponse } from 'next/server'

/**
 * GET /api/payment/test
 * Route de diagnostic supprimée pour raisons de sécurité.
 * Cette route exposait des informations sur les credentials de paiement sans authentification.
 */
export async function GET() {
  return NextResponse.json(
    { message: 'Cette route de diagnostic a été supprimée.' },
    { status: 410 }
  )
}
