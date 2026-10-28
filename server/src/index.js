import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createPool } from './db.js';
import { createApp } from './app.js';

const pool = createPool();
const app = createApp({ pool, demoMode: process.env.DEMO_MODE === '1' });

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
app.listen(port, () => console.log(`SAMAY API on :${port} (demo mode: ${process.env.DEMO_MODE === '1'}, client: ${existsSync(clientDist) ? 'embedded' : 'none'})`));
