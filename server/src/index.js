import 'dotenv/config';
import { createPool } from './db.js';
import { createApp } from './app.js';
const pool = createPool();
const app = createApp({ pool, demoMode: process.env.DEMO_MODE === '1' });
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`SAMAY API on :${port} (demo mode: ${process.env.DEMO_MODE === '1'})`));
