-- ==============================================================================
-- Sales Companion 2.0 — Schema PostgreSQL Supabase pour les Prospects Privés
-- Table 100% isolée et confidentielle pour les imports et opportunités d'organisations
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Table principale des prospects privés (Imports SM, TM et Indépendants)
CREATE TABLE IF NOT EXISTS public.private_prospects (
  id TEXT PRIMARY KEY,                             -- Format: "imp_XXXXX" ou id Firestore
  org_code TEXT,                                   -- Code unique organisation ("SC-CM-XXXXX", null si indépendant)
  user_id TEXT NOT NULL,                           -- UID Firebase du créateur / importateur
  manager_uid TEXT,                                -- UID Firebase du manager en charge
  assigned_to TEXT,                                -- UID Firebase du commercial terrain (si assigné)
  assigned_member_name TEXT,                       -- Nom d'affichage du commercial
  company_name TEXT NOT NULL,                      -- Raison sociale ou nom d'entreprise
  country_code VARCHAR(2) NOT NULL DEFAULT 'CM',    -- "CM", "CI", "SN", etc.
  sector TEXT,                                     -- Secteur d'activité
  city TEXT,                                       -- Ville
  quarter TEXT,                                    -- Quartier
  region TEXT,                                     -- Région administrative
  phone TEXT,                                      -- Téléphone
  email TEXT,                                      -- Email
  notes TEXT,                                      -- Notes internes de qualification
  status TEXT DEFAULT 'new',                       -- 'new' | 'transferred' | 'assigned' | 'contacted' | 'concluded'
  transfer_deadline TIMESTAMPTZ,                  -- Échéance fixée par le Senior Manager pour le TM
  assignment_deadline TIMESTAMPTZ,                -- Échéance fixée par le TM pour le commercial
  transferred_to_manager_uid TEXT,                -- Historique de transfert SM -> TM
  transferred_from_senior_uid TEXT,               -- UID du SM d'origine
  pipeline_entry_id TEXT,                         -- ID de fiche pipeline liée si converti
  raw_data JSONB DEFAULT '{}'::jsonb,             -- Métadonnées d'origine (colonnes CSV additionnelles)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index de performance et d'isolation multi-tenant
CREATE INDEX IF NOT EXISTS idx_private_prospects_org_code 
  ON public.private_prospects(org_code) 
  WHERE org_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_prospects_manager 
  ON public.private_prospects(manager_uid);

CREATE INDEX IF NOT EXISTS idx_private_prospects_assigned 
  ON public.private_prospects(assigned_to) 
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_prospects_user 
  ON public.private_prospects(user_id);

CREATE INDEX IF NOT EXISTS idx_private_prospects_status 
  ON public.private_prospects(status);

CREATE INDEX IF NOT EXISTS idx_private_prospects_created_at 
  ON public.private_prospects(created_at DESC);

-- Index composite optimisé pour les requêtes du Senior Manager (orgCode + managerUid)
CREATE INDEX IF NOT EXISTS idx_private_prospects_org_manager 
  ON public.private_prospects(org_code, manager_uid);

-- Index Trigramme GIN pour la recherche floue et ultra-rapide par nom d'entreprise
CREATE INDEX IF NOT EXISTS idx_private_prospects_trgm_name 
  ON public.private_prospects USING gin (company_name gin_trgm_ops);

-- 4. 🔒 VERROUILLAGE ROW LEVEL SECURITY (RLS) : Isolation stricte
ALTER TABLE public.private_prospects ENABLE ROW LEVEL SECURITY;

-- Accès complet réservé au service_role (Admin API Next.js côté serveur)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'private_prospects' AND policyname = 'Allow service_role full access'
  ) THEN
    CREATE POLICY "Allow service_role full access"
      ON public.private_prospects FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Sécurité : Interdiction stricte de tout accès public anonyme
REVOKE ALL ON public.private_prospects FROM anon;
