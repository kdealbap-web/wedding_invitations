import { createClient } from '@supabase/supabase-js'

const URL  = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

// Mensaje explícito: el de la librería ("supabaseUrl is required") no dice qué
// falta ni dónde ponerlo.
if (!URL || !ANON) {
  throw new Error(
    'Falta configuración de Supabase: define VITE_SUPABASE_URL y ' +
    'VITE_SUPABASE_ANON_KEY. Copia .env.example a .env, rellena los valores ' +
    '(Supabase → Project Settings → API) y reinicia el servidor de Vite.',
  )
}

export const supabase = createClient(URL, ANON)
