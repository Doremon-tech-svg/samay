import 'dotenv/config';
import { createPool } from '../src/db.js';
import { loadSchema, seedRegistry, seedSynthetic } from './seedData.js';
const pool = createPool();
await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await loadSchema(pool); await seedRegistry(pool);
if (process.argv.includes('--synthetic')) await seedSynthetic(pool);
console.log('database initialised', process.argv.includes('--synthetic') ? '(with synthetic applications)' : '');
await pool.end();
