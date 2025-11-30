// Frontend logger that sends logs to Axiom
// Only logs in production/staging environments

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
// Check if we're in staging by looking at the backend URL or a custom env var
const isStaging = process.env.NEXT_PUBLIC_BACKEND_URL?.includes('staging') || 
                  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('staging') ||
                  false;

// Determine dataset based on environment
function getDataset(): string | null {
  if (isProduction && !isStaging) return 'gs-production';
  if (isStaging) return 'gs-staging';
  return null; // Don't log to Axiom in development
}

// Send log to Axiom via backend API
async function sendToAxiom(level: string, message: string, data?: any) {
  const dataset = getDataset();
  if (!dataset) return; // Skip in development

  try {
    // Send log to backend API which will forward to Axiom
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        message,
        data,
        source: 'frontend',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.debug('[Logger] Failed to send log to backend:', response.statusText);
    }
  } catch (error) {
    // Silently fail to avoid infinite loops
    console.debug('[Logger] Failed to send log to Axiom:', error);
  }
}

// Helper to mask sensitive values
function maskSensitive(value: string | undefined): string {
  if (!value) return '[NOT SET]';
  if (value.length < 10) return '[SET]';
  return `[SET - ${value.length} chars]`;
}

export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || '');
    if (!isDevelopment) {
      sendToAxiom('info', message, data);
    }
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
    if (!isDevelopment) {
      sendToAxiom('warn', message, data);
    }
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
    if (!isDevelopment) {
      sendToAxiom('error', message, {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
        } : error,
      });
    }
  },
  
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },
  
  // Log startup information
  logStartup: () => {
    const env = {
      NODE_ENV: process.env.NODE_ENV || '[NOT SET]',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '[NOT SET]',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: maskSensitive(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || '[NOT SET]',
    };

    logger.info('Frontend application starting...', {
      event: 'frontend_startup',
      phase: 'initialization',
      env,
    });
  },
  
  // Log Supabase initialization
  logSupabaseInit: (success: boolean, error?: any) => {
    logger.info('Supabase client initialization', {
      event: 'supabase_init',
      success,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
      } : error,
      config: {
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '[NOT SET]',
        SUPABASE_ANON_KEY: maskSensitive(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
    });
  },
};

