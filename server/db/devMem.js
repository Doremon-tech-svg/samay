// Zero-setup dev server: in-memory Postgres emulator (pg-mem) with the real schema, registry and synthetic data.
// Data resets on restart. Use real Postgres (docker compose up) for anything you want to keep.
import { newDb } from 'pg-mem';
import { createApp } from '../src/app.js';
import { loadSchema, seedRegistry, seedSynthetic } from './seedData.js';
const { Pool } = newDb().adapters.createPg(); const pool = new Pool();
await loadSchema(pool); await seedRegistry(pool); await seedSynthetic(pool);
const port = process.env.PORT || 4000;
createApp({ pool, demoMode: true }).listen(port, () => console.log(`SAMAY API (in-memory DB, demo mode) on :${port}`));
