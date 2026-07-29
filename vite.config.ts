import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';

function cruzadorPlugin() {
  return {
    name: 'cruzador-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/cross-join', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { fileName, csvContent } = data;
            
            const tempInputDir = path.resolve(__dirname, 'cruzador_blocklist/temp');
            if (!fs.existsSync(tempInputDir)) {
              fs.mkdirSync(tempInputDir, { recursive: true });
            }
            
            const tempInputPath = path.join(tempInputDir, fileName || 'input.csv');
            fs.writeFileSync(tempInputPath, csvContent, 'utf-8');

            const scriptPath = path.resolve(__dirname, 'cruzador_blocklist/cruzador_blocklist.py');
            const cwdPath = path.resolve(__dirname, 'cruzador_blocklist');

            execFile('python3', [scriptPath, tempInputPath], { cwd: cwdPath }, (error, stdout, stderr) => {
              if (error) {
                console.error('Python cross-join error:', stderr || error.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: stderr || error.message }));
                return;
              }

              const match = stdout.match(/DONE:(\d+):(\d+):(\d+):([^:]+):(.+)/);
              if (match) {
                const totalRows = parseInt(match[1]);
                const keptRows = parseInt(match[2]);
                const removedRows = parseInt(match[3]);
                const detectedPhoneCol = match[4];
                const outputPath = match[5].trim();

                const outContent = fs.readFileSync(outputPath, 'utf-8');
                const outputFileName = path.basename(outputPath);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  totalRows,
                  keptRows,
                  removedRows,
                  detectedPhoneCol,
                  outputFileName,
                  csvContent: outContent
                }));
              } else {
                console.error('Python output stdout:', stdout);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Falha ao processar resposta do script Python' }));
              }
            });
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    }
  };
}

function storagePlugin() {
  const dbDir = path.resolve(__dirname, 'demands_db_data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return {
    name: 'storage-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/storage', async (req: any, res: any) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        res.setHeader('Content-Type', 'application/json');

        // GET ALL: /api/storage/all or /api/storage?all=true
        if (req.method === 'GET' && (url.pathname === '/all' || url.searchParams.has('all'))) {
          try {
            const files = fs.readdirSync(dbDir);
            const allData: Record<string, any> = {};
            for (const file of files) {
              if (file.endsWith('.json')) {
                const key = file.replace('.json', '');
                const filePath = path.join(dbDir, file);
                try {
                  const content = fs.readFileSync(filePath, 'utf-8');
                  allData[key] = JSON.parse(content);
                } catch (e) {
                  console.error(`Error reading ${file}:`, e);
                }
              }
            }
            res.statusCode = 200;
            res.end(JSON.stringify(allData));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // GET SINGLE KEY: /api/storage?key=xxx
        if (req.method === 'GET') {
          const key = url.searchParams.get('key');
          if (!key) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing key parameter' }));
            return;
          }
          const filePath = path.join(dbDir, `${key.replace(/[^a-zA-Z0-9_-]/g, '')}.json`);
          if (fs.existsSync(filePath)) {
            try {
              const content = fs.readFileSync(filePath, 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, key, data: JSON.parse(content) }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Key not found', key }));
          }
          return;
        }

        // POST SAVE: /api/storage (saves key & data)
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const { key, data } = payload;
              if (!key) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing key parameter' }));
                return;
              }
              const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
              const filePath = path.join(dbDir, `${safeKey}.json`);
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, key: safeKey }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), cruzadorPlugin(), storagePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true
  }
});
