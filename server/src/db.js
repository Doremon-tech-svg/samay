import pg from 'pg';

function connectionStringFromEnv() {
  const raw = process.env.DATABASE_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (raw) return raw;

  const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
  if (PGHOST && PGDATABASE && PGUSER) {
    const port = PGPORT || '5432';
    return `postgresql://${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD || '')}@${PGHOST}:${port}/${PGDATABASE}`;
  }

  throw new Error('DATABASE_URL is not set (see server/.env.example)');
}

export function createPool() {
  const connectionString = connectionStringFromEnv();

  const isLocal = connectionString.includes('localhost') || 
                  connectionString.includes('127.0.0.1') || 
                  connectionString.includes('@db:');

  const poolConfig = { connectionString };
  if (!isLocal) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = new pg.Pool(poolConfig);
  pool.on('error', (error) => {
    console.error('PostgreSQL pool error:', error.message);
  });
  return pool;
}
