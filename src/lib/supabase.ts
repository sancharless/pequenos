import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Apenas instancia o cliente se as variáveis estiverem configuradas
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      }
    })
  : null;

if (!supabase) {
  console.warn('Supabase credentials missing. SMM Panel will fall back to local JSON database persistence.');
}
