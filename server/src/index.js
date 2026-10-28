import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createPool } from './db.js';
import { createApp } from './app.js';

import { loadSchema, seedRegistry, seedSynthetic } from '../db/seedData.js';

const pool = createPool();
const app = createApp({ pool, demoMode: process.env.DEMO_MODE === '1' });

// Auto-initialize schema & seed data if database is fresh / deployed to empty PostgreSQL
async function ensureDatabaseReady(p) {
  try {
    const { rows } = await p.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'services'
      );
    `);
    if (!rows[0]?.exists) {
      console.log('Database tables missing. Running automatic schema migration and seed...');
      await loadSchema(p);
      await seedRegistry(p);
      await seedSynthetic(p);
      console.log('Database successfully initialized with schema, registry, and synthetic data!');
    } else {
      const { rows: countRows } = await p.query('SELECT COUNT(*) AS c FROM services');
      if (Number(countRows[0]?.c) === 0) {
        console.log('Services table empty. Seeding registry and synthetic data...');
        await seedRegistry(p);
        await seedSynthetic(p);
      }
    }
  } catch (err) {
    console.error('Database readiness check notice:', err.message);
  }
}

// Emergency manual migration trigger (can be called via GET/POST /api/admin/init-db)
app.all('/api/admin/init-db', async (_req, res) => {
  try {
    await loadSchema(pool);
    await seedRegistry(pool);
    await seedSynthetic(pool);
    res.json({ ok: true, message: 'Database initialized with schema, registry, and synthetic applications' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const port = process.env.PORT || 4000;
await ensureDatabaseReady(pool);
app.listen(port, () => console.log(`SAMAY API on :${port} (demo mode: ${process.env.DEMO_MODE === '1'}, client: ${existsSync(clientDist) ? 'embedded' : 'none'})`));
