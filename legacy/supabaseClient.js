// Configuración global de Supabase (única instancia)
const SUPABASE_URL = 'https://umvgvboaejoxizxtqasd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KJ1Jgn2cDYpJ9GP_17HT5w_mix5U7mH';

// Crear cliente y exponerlo globalmente
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);