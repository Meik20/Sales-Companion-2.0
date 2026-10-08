import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Ancienne route d'activation dépréciée et désactivée pour des motifs de sécurité critique
 * (prévention d'élévation de privilège et de prise de contrôle de compte).
 * Toutes les activations passent désormais exclusivement par /api/team/activate.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Cette route d'activation est obsolète et désactivée. Veuillez utiliser /api/team/activate ou contacter votre manager."
    },
    { status: 410 }
  )
}

export async function GET() {
  return NextResponse.json({ error: 'Méthode non autorisée' }, { status: 405 })
}
