import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data.json');

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get('/api/data', (req, res) => {
    console.log('GET /api/data - Reading data from file');
    try {
      if (!fs.existsSync(DATA_FILE)) {
        console.log('Data file not found, creating initial state');
        const initialState = { 
          transactions: [], 
          manager: { name: 'Manager Name', photo: null }, 
          notes: [],
          runningPrograms: {} 
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialState, null, 2));
        return res.json(initialState);
      }
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      console.error('Error reading data file:', error);
      res.status(500).json({ error: 'Failed to read data' });
    }
  });

  app.post('/api/data', (req, res) => {
    console.log('POST /api/data - Saving data to file');
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
      console.log('Data saved successfully to', DATA_FILE);
      res.json({ success: true });
    } catch (error) {
      console.error('Error writing data file:', error);
      res.status(500).json({ error: 'Failed to save data' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
