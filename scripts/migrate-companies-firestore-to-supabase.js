#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { FieldPath, getFirestore } = require('firebase-admin/firestore')

const ROOT = path.resolve(__dirname, '..')
const PAGE_SIZE = 500
const SUPABASE_CHUNK_SIZE = 500

function loadEnvironmentFiles() {
  for (const relativePath of ['.env', '.env.local', 'apps/web/.env', 'apps/web/.env.local']) {
    const filePath = path.join(ROOT, relativePath)
    if (!fs.existsSync(filePath)) continue

    const content = fs.readFileSync(filePath, 'utf8')
    const expression = /^([A-Z0-9_]+)=("[\s\S]*?(?<!\\)"|'[\s\S]*?(?<!\\)'|[^\r\n]*)/gm
    let match

    while ((match = expression.exec(content)) !== null) {
      const [, key, rawValue] = match
      if (process.env[key] !== undefined) continue

      let value = rawValue.trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }
}

function parseServiceAccount(rawValue) {
  if (!rawValue) return null

  const value = rawValue.trim()
  for (const candidate of [value, Buffer.from(value, 'base64').toString('utf8')]) {
    try {
      const account = JSON.parse(candidate)
      if (account.project_id && account.client_email && account.private_key) return account
    } catch {
      // Try the next supported encoding.
    }
  }
  return null
}

function getFirebaseCredential() {
  const serviceAccount = parseServiceAccount(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_ADMIN_SDK_KEY
  )
  if (serviceAccount) return cert(serviceAccount)

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey })
  }
  throw new Error('Credentials Firebase Admin manquantes dans les fichiers .env locaux.')
}

function firstValue(data, fields) {
  for (const field of fields) {
    const value = data[field]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return null
}

function asText(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() || null
  return String(value)
}

function asIsoTimestamp(value) {
  if (!value) return undefined
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function toJsonSafe(value) {
  if (value === null || value === undefined) return value ?? null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return value.toString('base64')
  if (Array.isArray(value)) return value.map(toJsonSafe)
  if (typeof value === 'object') {
    if (value.constructor?.name === 'DocumentReference' && typeof value.path === 'string') {
      return value.path
    }
    if (value.constructor?.name === 'GeoPoint') {
      return { latitude: value.latitude, longitude: value.longitude }
    }
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toJsonSafe(entry)]))
  }
  if (typeof value === 'bigint') return value.toString()
  return value
}

function mapCompany(document) {
  const data = document.data()
  const raisonSociale = asText(firstValue(data, ['raisonSociale', 'raison_sociale', 'name']))
  if (!raisonSociale) return null

  const record = {
    id: document.id,
    country_code: 'CM',
    raison_sociale: raisonSociale,
    sigle: asText(firstValue(data, ['sigle'])),
    niu: asText(firstValue(data, ['niu'])),
    sector: asText(firstValue(data, ['sector', 'activite_principale', 'activitePrincipale'])),
    region: asText(firstValue(data, ['region', 'centre_de_rattachement', 'centreDeRattachement'])),
    city: asText(firstValue(data, ['city', 'ville'])),
    adresse: asText(firstValue(data, ['adresse', 'address'])),
    telephone: asText(firstValue(data, ['telephone', 'phone'])),
    email: asText(firstValue(data, ['email', 'mail'])),
    dirigeant: asText(firstValue(data, ['dirigeant', 'responsable'])),
    rccm: asText(firstValue(data, ['rccm'])),
    forme_juridique: asText(firstValue(data, ['formeJuridique', 'forme_juridique'])),
    capital: asText(firstValue(data, ['capital'])),
    date_creation: asText(firstValue(data, ['dateCreation', 'date_creation'])),
    active: typeof data.active === 'boolean' ? data.active : true,
    imported_by: asText(firstValue(data, ['importedBy', 'imported_by'])),
    raw_data: toJsonSafe(data)
  }

  const createdAt = asIsoTimestamp(firstValue(data, ['createdAt', 'created_at']))
  const updatedAt = asIsoTimestamp(firstValue(data, ['updatedAt', 'updated_at']))
  if (createdAt) record.created_at = createdAt
  if (updatedAt) record.updated_at = updatedAt
  return record
}

async function readAllCompanies(db) {
  const records = []
  let cursor = null

  while (true) {
    let query = db
      .collection('companies')
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE)
    if (cursor) query = query.startAfter(cursor)

    let snapshot
    try {
      snapshot = await query.get()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('RESOURCE_EXHAUSTED') || message.toLowerCase().includes('quota exceeded')) {
        throw new Error(
          `Quota de lecture Firestore atteinte après ${records.length} fiches. ` +
            'Aucune écriture Supabase n’a été effectuée; relancez la simulation après le rétablissement du quota.'
        )
      }
      throw error
    }
    if (snapshot.empty) break

    for (const document of snapshot.docs) records.push(mapCompany(document))
    cursor = snapshot.docs[snapshot.docs.length - 1]
    console.log(`Firestore lus : ${records.length} fiches`)
    if (snapshot.size < PAGE_SIZE) break
  }
  return records
}

function summarize(records) {
  const validRecords = records.filter(Boolean)
  const niuToIds = new Map()
  for (const record of validRecords) {
    if (!record.niu) continue
    const niu = record.niu.replace(/\s+/g, '').toUpperCase()
    const ids = niuToIds.get(niu) ?? []
    ids.push(record.id)
    niuToIds.set(niu, ids)
  }

  const duplicateNiuGroups = [...niuToIds.values()].filter((ids) => ids.length > 1)
  return {
    total: records.length,
    ready: validRecords.length,
    missingName: records.length - validRecords.length,
    duplicateNiuGroups: duplicateNiuGroups.length
  }
}

async function assertSupabaseSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!baseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.')
  }

  const response = await fetch(
    `${baseUrl}/rest/v1/companies?select=id,country_code,raison_sociale&limit=0`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      },
      signal: AbortSignal.timeout(15000)
    }
  )
  if (!response.ok) {
    const details = await response.text()
    throw new Error(
      `Supabase refuse l'accès à public.companies (HTTP ${response.status}): ${details}`
    )
  }
  return { baseUrl, serviceKey }
}

async function upsertCompanies(records, baseUrl, serviceKey) {
  for (let start = 0; start < records.length; start += SUPABASE_CHUNK_SIZE) {
    const chunk = records.slice(start, start + SUPABASE_CHUNK_SIZE)
    const response = await fetch(`${baseUrl}/rest/v1/companies?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(chunk),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const details = await response.text()
      throw new Error(
        `Échec Supabase au lot ${Math.floor(start / SUPABASE_CHUNK_SIZE) + 1} (HTTP ${response.status}); ` +
          `${start} fiches confirmées avant ce lot. ${details}`
      )
    }
    console.log(
      `Supabase enregistrées : ${Math.min(start + chunk.length, records.length)}/${records.length}`
    )
  }
}

async function main() {
  loadEnvironmentFiles()
  const execute = process.argv.includes('--execute')
  const showHelp = process.argv.includes('--help') || process.argv.includes('-h')

  if (showHelp) {
    console.log(
      'Usage: node scripts/migrate-companies-firestore-to-supabase.js [--execute]\n' +
        'Sans --execute, le script effectue uniquement une simulation en lecture seule.'
    )
    return
  }

  if (getApps().length === 0) {
    initializeApp({ credential: getFirebaseCredential() })
  }
  const db = getFirestore()

  console.log('Lecture paginée de Firestore /companies…')
  const mappedRecords = await readAllCompanies(db)
  const summary = summarize(mappedRecords)

  console.log('\nRésumé de migration (pays cible : CM)')
  console.log(`Documents Firestore : ${summary.total}`)
  console.log(`Fiches prêtes       : ${summary.ready}`)
  console.log(`Sans raison sociale : ${summary.missingName}`)
  console.log(`Groupes NIU doublons: ${summary.duplicateNiuGroups}`)

  if (summary.missingName > 0 || summary.duplicateNiuGroups > 0) {
    throw new Error(
      'Migration bloquée : corrigez les fiches sans nom ou les NIU en doublon avant toute écriture.'
    )
  }

  const { baseUrl, serviceKey } = await assertSupabaseSchema()
  console.log('Table Supabase public.companies : accessible')

  if (!execute) {
    console.log('\nSimulation terminée, aucune donnée écrite. Relancez avec --execute pour migrer.')
    return
  }

  await upsertCompanies(mappedRecords, baseUrl, serviceKey)
  console.log(
    `\nMigration terminée : ${mappedRecords.length} fiches upsertées. Firestore est inchangé.`
  )
}

main().catch((error) => {
  console.error('[migration entreprises]', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
