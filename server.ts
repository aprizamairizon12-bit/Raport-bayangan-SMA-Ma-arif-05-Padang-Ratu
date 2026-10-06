import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, 'cloud_database.json');

const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/api/cloud-state', (_req, res) => {
  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(raw);
    } catch {
      res.status(500).json({ error: 'Failed to read cloud database' });
    }
  } else {
    res.status(404).json({ initialized: false });
  }
});

app.post('/api/cloud-state', (req, res) => {
  try {
    const payload = req.body;
    fs.writeFileSync(dbFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    res.status(200).json({ ok: true, lastUpdated: payload.lastUpdated });
  } catch {
    res.status(400).json({ error: 'Failed to write cloud database' });
  }
});

const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Raport Bayangan SMA Ma'arif 05 Padang Ratu running on port ${PORT}`);
});
