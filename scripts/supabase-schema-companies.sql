-- ==============================================================================
-- Sales Companion 2.0 — Schema PostgreSQL Supabase pour l'annuaire Entreprises
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Extensions nécessaires pour la recherche textuelle haute performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Table principale des entreprises B2B
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,                       -- Ex: "CI_2104589A", "CM_M051912783451A"
  country_code VARCHAR(2) NOT NULL,          -- "CM", "SN", "CI", "BJ", "TG", "TD", "CF"
  raison_sociale TEXT NOT NULL,
  sigle TEXT,
  niu TEXT,
  sector TEXT,
  region TEXT,
  city TEXT,
  adresse TEXT,
  telephone TEXT,
  email TEXT,
  dirigeant TEXT,
  rccm TEXT,
  forme_juridique TEXT,
  capital TEXT,
  date_creation TEXT,
  active BOOLEAN DEFAULT true,
  imported_by TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Compatibilité avec la première version du schéma, qui nommait cette colonne "country".
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'country'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE public.companies RENAME COLUMN country TO country_code;
  END IF;
END $$;

-- 3. Contrainte d'unicité par pays et NIU (aucun doublon au sein du même pays)
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_country_niu
  ON public.companies(country_code, niu)
  WHERE niu IS NOT NULL AND niu != '';

-- 4. Index de filtrage rapide
CREATE INDEX IF NOT EXISTS idx_companies_country_code ON public.companies(country_code);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON public.companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_city ON public.companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_region ON public.companies(region);

-- 5. Index Trigramme GIN pour recherche floue instantanée (5ms) et tolérance aux fautes
CREATE INDEX IF NOT EXISTS idx_companies_trgm_name
  ON public.companies USING gin (raison_sociale gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_companies_trgm_sigle
  ON public.companies USING gin (sigle gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_companies_trgm_niu
  ON public.companies USING gin (niu gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_companies_trgm_dirigeant
  ON public.companies USING gin (dirigeant gin_trgm_ops);

-- 6. Sécurité Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture publique / authentifiée pour l'application
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Allow public read access'
  ) THEN
    CREATE POLICY "Allow public read access"
      ON public.companies FOR SELECT
      TO anon, authenticated, service_role
      USING (true);
  END IF;
END $$;

-- Seul le rôle serveur (service_role de Next.js) peut insérer, mettre à jour et supprimer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Allow service_role full access'
  ) THEN
    CREATE POLICY "Allow service_role full access"
      ON public.companies FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
