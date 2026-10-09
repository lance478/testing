import express from 'express';
import http from 'http';
import pg from 'pg';
import { WebSocketServer } from 'ws';

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await db.query(`CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  col TEXT NOT NULL DEFAULT 'todo',
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);

const { rows: [{ count }] } = await db.query('SELECT count(*)::int FROM cards');
if (count === 0) {
  const seed = [['Design landing page', 'todo'], ['Set up CI', 'todo'], ['Build API', 'doing'], ['Write README', 'done']];
  for (const [i, [title, col]] of seed.entries()) {
    await db.query('INSERT INTO cards (title, col, position) VALUES ($1, $2, $3)', [title, col, i]);
  }
}

const listCards = async () =>
  (await db.query('SELECT id, title, col, position FROM cards ORDER BY position, id')).rows;

const app = express();
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const broadcast = async () => {
  const msg = JSON.stringify({ type: 'cards', cards: await listCards() });
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
};

wss.on('connection', async (ws) => {
  ws.send(JSON.stringify({ type: 'cards', cards: await listCards() }));
  const online = JSON.stringify({ type: 'online', count: wss.clients.size });
  for (const c of wss.clients) if (c.readyState === 1) c.send(online);
  ws.on('close', () => {
    const msg = JSON.stringify({ type: 'online', count: wss.clients.size });
    for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
  });
});

app.get('/api/cards', async (_req, res) => res.json(await listCards()));

app.post('/api/cards', async (req, res) => {
  const { title, col = 'todo' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  const { rows } = await db.query(
    `INSERT INTO cards (title, col, position)
     VALUES ($1, $2, COALESCE((SELECT max(position) FROM cards WHERE col = $2), 0) + 1) RETURNING *`,
    [title.trim(), col]
  );
  res.status(201).json(rows[0]);
  broadcast();
});

app.patch('/api/cards/:id', async (req, res) => {
  const { col, position } = req.body;
  const { rows } = await db.query(
    'UPDATE cards SET col = COALESCE($1, col), position = COALESCE($2, position) WHERE id = $3 RETURNING *',
    [col ?? null, position ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).end();
  res.json(rows[0]);
  broadcast();
});

app.delete('/api/cards/:id', async (req, res) => {
  await db.query('DELETE FROM cards WHERE id = $1', [req.params.id]);
  res.status(204).end();
  broadcast();
});

server.listen(process.env.PORT || 4000, () => console.log('API listening on', process.env.PORT || 4000));
