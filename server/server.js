import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'poems.json');
const DEFAULT_PASSWORD = 'newday';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function loadPoems() {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function savePoems(poems) {
  writeFileSync(DATA_FILE, JSON.stringify(poems, null, 2));
}

let nextId = 1;
function getNextId() {
  const poems = loadPoems();
  if (poems.length === 0) return 1;
  return Math.max(...poems.map(p => p.id)) + 1;
}

// Auth
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === DEFAULT_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: 'Incorrect password' });
  }
});

// List poems
app.get('/api/poems', (req, res) => {
  try {
    const poems = loadPoems();
    res.json(poems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch poems' });
  }
});

// Create poem
app.post('/api/poems', (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    const poems = loadPoems();
    const poem = {
      id: getNextId(),
      title,
      body,
      created_at: new Date().toISOString()
    };
    poems.unshift(poem);
    savePoems(poems);
    res.status(201).json(poem);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create poem' });
  }
});

// Update poem
app.put('/api/poems/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    const poems = loadPoems();
    const idx = poems.findIndex(p => p.id === parseInt(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Poem not found' });
    }
    poems[idx] = { ...poems[idx], title, body };
    savePoems(poems);
    res.json(poems[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update poem' });
  }
});

// Delete poem
app.delete('/api/poems/:id', (req, res) => {
  try {
    const { id } = req.params;
    const poems = loadPoems();
    const idx = poems.findIndex(p => p.id === parseInt(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Poem not found' });
    }
    poems.splice(idx, 1);
    savePoems(poems);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete poem' });
  }
});

app.listen(PORT, () => {
  console.log(`Poetry API running on http://localhost:${PORT}`);
});
