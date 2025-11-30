import { createBrowserClient } from '@supabase/ssr';
import { logger } from '../logger';

export function createClient() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      logger.error('NEXT_PUBLIC_SUPABASE_URL is not set');
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    }

    if (!supabaseAnonKey) {
      logger.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    }

    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
    
    logger.logSupabaseInit(true);
    
    return client;
  } catch (error) {
    logger.logSupabaseInit(false, error);
    throw error;
  }
}