import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function cloudDatabasePlugin(): Plugin {
  const dbFilePath = path.resolve(__dirname, 'cloud_database.json');

  return {
    name: 'sma-maarif05-cloud-db',
    configureServer(server) {
      server.middlewares.use('/api/cloud-state', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET') {
          if (fs.existsSync(dbFilePath)) {
            try {
              const raw = fs.readFileSync(dbFilePath, 'utf-8');
              res.statusCode = 200;
              res.end(raw);
              return;
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({error: 'Failed to read cloud database'}));
              return;
            }
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({initialized: false}));
            return;
          }
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              fs.writeFileSync(dbFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ok: true, lastUpdated: parsed.lastUpdated}));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({error: 'Invalid JSON payload'}));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cloudDatabasePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
