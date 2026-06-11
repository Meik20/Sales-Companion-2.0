import { Metadata } from 'next'
import Link from 'next/link'
import { ScIcon } from '@/components/ui/ScIcon'

export const metadata: Metadata = {
  title: 'Annuaire B2B des Entreprises au Cameroun',
  description:
    "Parcourez l'annuaire des entreprises camerounaises par région (Douala, Yaoundé...) et par secteur d'activité (BTP, Tech, Finance...). Base de données RCCM/NIU vérifiée.",
}

export default function AnnuaireHub() {
  const regions = [
    { name: 'Douala', slug: 'douala', count: '15 000+' },
    { name: 'Yaoundé', slug: 'yaounde', count: '12 000+' },
    { name: 'Bafoussam', slug: 'bafoussam', count: '3 500+' },
    { name: 'Garoua', slug: 'garoua', count: '2 100+' },
    { name: 'Bamenda', slug: 'bamenda', count: '1 800+' }
  ]

  const secteurs = [
    { name: 'Bâtiment & Travaux Publics (BTP)', slug: 'btp', icon: '🏗️' },
    { name: "Technologies de l'Information (Tech)", slug: 'tech', icon: '💻' },
    { name: 'Banque, Finance & Assurance', slug: 'finance', icon: '🏦' },
    { name: 'Logistique & Transport', slug: 'logistique', icon: '🚚' },
    { name: 'Agroalimentaire & Agriculture', slug: 'agro', icon: '🌾' },
    { name: 'Commerce & Distribution', slug: 'commerce', icon: '🛒' }
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--tx)] flex flex-col">
      {/* Navbar Minimaliste pour préserver la navigation principale */}
      <nav className="border-b border-[var(--bd)] sticky top-0 bg-[var(--bg)] z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 no-underline"
            title="Retour à l'accueil"
          >
            <ScIcon size={28} className="text-[var(--gm)]" />
            <span className="text-lg font-bold hidden sm:inline-block">
              Sales <em className="text-[var(--gm)] not-italic">Companion 2.0</em>
            </span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--tx2)] hover:text-[var(--gm)] transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-[var(--gm)] hover:text-[#2ea05a] transition-colors"
            >
              Essai Gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* Contenu Principal */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            L'Annuaire B2B <span className="text-[var(--gm)]">Camerounais</span>
          </h1>
          <p className="text-lg text-[var(--tx2)] max-w-2xl mx-auto">
            Trouvez vos futurs clients et partenaires. Parcourez notre base de données officielle de
            plus de 50 000 entreprises camerounaises par région et par secteur d'activité.
          </p>
        </header>

        {/* Section Régions */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-8 flex items-center gap-2">
            📍 Parcourir par Région / Ville
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {regions.map((region) => (
              <Link
                key={region.slug}
                href={`/annuaire/${region.slug}`}
                className="group flex flex-col p-6 rounded-xl border border-[var(--bd)] bg-[var(--dark2)] hover:border-[var(--gm)] hover:bg-[rgba(27,122,62,0.05)] transition-all"
                title={`Liste des entreprises à ${region.name}`}
              >
                <span className="text-lg font-medium group-hover:text-[var(--gm)] transition-colors">
                  {region.name}
                </span>
                <span className="text-sm text-[var(--tx3)] mt-2">{region.count} entreprises</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Section Secteurs */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-8 flex items-center gap-2">
            🏢 Parcourir par Secteur d'Activité
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {secteurs.map((secteur) => (
              <Link
                key={secteur.slug}
                href={`/annuaire/${secteur.slug}`}
                className="group flex items-center gap-4 p-5 rounded-xl border border-[var(--bd)] bg-[var(--dark2)] hover:border-[var(--gm)] hover:bg-[rgba(27,122,62,0.05)] transition-all"
                title={`Annuaire des entreprises du secteur : ${secteur.name}`}
              >
                <span className="text-2xl bg-[var(--dark3)] p-3 rounded-lg border border-[var(--bd)]">
                  {secteur.icon}
                </span>
                <span className="text-lg font-medium group-hover:text-[var(--gm)] transition-colors">
                  {secteur.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-20 p-8 rounded-2xl bg-gradient-to-r from-[var(--dark3)] to-[var(--bg)] border border-[var(--gm)] border-opacity-30 text-center">
          <h3 className="text-2xl font-bold mb-4">Accès complet à la base de données</h3>
          <p className="text-[var(--tx2)] mb-6 max-w-xl mx-auto">
            Inscrivez-vous gratuitement pour accéder aux contacts des dirigeants, exporter vos
            listes de prospection et gérer votre pipeline directement dans le CRM intégré.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3 bg-[var(--gm)] text-white rounded-lg font-medium hover:bg-[#2ea05a] transition-colors"
          >
            Créer mon compte gratuit
          </Link>
        </div>
      </main>

      {/* Footer Minimaliste */}
      <footer className="border-t border-[var(--bd)] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-[var(--tx3)] flex flex-col md:flex-row items-center justify-between gap-4">
          <span>
            &copy; {new Date().getFullYear()} Sales Companion 2.0. Base de données des entreprises au
            Cameroun.
          </span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-[var(--tx)] transition-colors">Accueil</Link>
            <Link href="/login" className="hover:text-[var(--tx)] transition-colors">CRM</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
