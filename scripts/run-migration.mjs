// ──────────────────────────────────────────────────────────────
//  Aplica un archivo SQL de migración directo a la base de datos
//  de Supabase (session pooler), usando las credenciales locales
//  de .env.secrets + supabase/.temp/pooler-url.
//
//  Uso:  node scripts/run-migration.mjs supabase/migrations/003_xxx.sql
// ──────────────────────────────────────────────────────────────
import pg from 'pg'
import { readFile } from 'node:fs/promises'

const file = process.argv[2]
if (!file) { console.error('Uso: node scripts/run-migration.mjs <archivo.sql>'); process.exit(1) }

const secrets   = await readFile('.env.secrets', 'utf8')
const password  = secrets.match(/SUPABASE_DB_PASSWORD=(.+)/)[1].trim()
const poolerUrl = (await readFile('supabase/.temp/pooler-url', 'utf8')).trim()
const u = new URL(poolerUrl)

const client = new pg.Client({
  host: u.hostname,
  port: Number(u.port),
  user: decodeURIComponent(u.username),
  password,
  database: u.pathname.replace(/^\//, '') || 'postgres',
  ssl: { rejectUnauthorized: false },
})

const sql = await readFile(file, 'utf8')
try {
  await client.connect()
  await client.query(sql)
  console.log('✓ Migración aplicada:', file)
} catch (e) {
  console.error('✗ Error aplicando migración:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
