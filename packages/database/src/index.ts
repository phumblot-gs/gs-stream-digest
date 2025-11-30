export { getDb, resetDb } from './client';

// Export the correct schemas based on database type (PostgreSQL or SQLite)
export * from './schemas';

// IMPORTANT: Do not export a pre-initialized db instance here!
// It would be called at module load time, before environment variables are loaded.
// Always use getDb() instead in your code.