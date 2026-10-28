import pg from 'pg';

export function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set (see .env.example)');

  const isLocal = connectionString.includes('localhost') || 
                  connectionString.includes('127.0.0.1') || 
                  connectionString.includes('@db:');

  const poolConfig = { connectionString };
  if (!isLocal) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return new pg.Pool(poolConfig);
}
