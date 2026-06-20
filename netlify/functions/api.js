import { getStore } from '@netlify/blobs';

const DEFAULT_PASSWORD = 'newday';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

async function getPoems() {
  const store = getStore('poems');
  const raw = await store.get('all', { type: 'json' });
  return Array.isArray(raw) ? raw : [];
}

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/^\/\.netlify\/functions\/api/, '') || '/';
  const method = req.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = ['POST', 'PUT'].includes(method) ? await req.json() : {};

    // POST /auth
    if (path === '/auth' && method === 'POST') {
      if (body.password === DEFAULT_PASSWORD) return json({ ok: true });
      return json({ error: 'Incorrect password' }, 401);
    }

    // GET /poems
    if (path === '/poems' && method === 'GET') {
      return json(await getPoems());
    }

    // POST /poems
    if (path === '/poems' && method === 'POST') {
      if (!body.title || !body.body) return json({ error: 'Title and body are required' }, 400);
      const store = getStore('poems');
      const raw = await store.get('all', { type: 'json' });
      const poems = Array.isArray(raw) ? raw : [];
      const newId = poems.length ? Math.max(...poems.map(p => p.id)) + 1 : 1;
      const poem = { id: newId, title: body.title, body: body.body, created_at: new Date().toISOString() };
      poems.unshift(poem);
      await store.setJSON('all', poems);
      return json(poem, 201);
    }

    // PUT /poems/:id
    const putMatch = path.match(/^\/poems\/(\d+)$/);
    if (putMatch && method === 'PUT') {
      if (!body.title || !body.body) return json({ error: 'Title and body are required' }, 400);
      const store = getStore('poems');
      const raw = await store.get('all', { type: 'json' });
      const poems = Array.isArray(raw) ? raw : [];
      const idx = poems.findIndex(p => p.id === parseInt(putMatch[1]));
      if (idx === -1) return json({ error: 'Poem not found' }, 404);
      poems[idx] = { ...poems[idx], title: body.title, body: body.body };
      await store.setJSON('all', poems);
      return json(poems[idx]);
    }

    // DELETE /poems/:id
    const delMatch = path.match(/^\/poems\/(\d+)$/);
    if (delMatch && method === 'DELETE') {
      const store = getStore('poems');
      const raw = await store.get('all', { type: 'json' });
      const poems = Array.isArray(raw) ? raw : [];
      const idx = poems.findIndex(p => p.id === parseInt(delMatch[1]));
      if (idx === -1) return json({ error: 'Poem not found' }, 404);
      poems.splice(idx, 1);
      await store.setJSON('all', poems);
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  } catch {
    return json({ error: 'Internal error' }, 500);
  }
};
