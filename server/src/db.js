import pg from 'pg';
export function createPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (see .env.example)');
  return new pg.Pool({ connectionString: process.env.DATABASE_URL });
}
