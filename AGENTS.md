# Realtime Kanban

- Run: `docker compose -f docker-compose.base44.yml up -d` (db + api :4000 + web :3000).
- Same origin: Vite proxies `/api` and `/ws` (WebSocket) to the `api` service.
- API creates its table and seeds 4 cards on boot. No migrations tool.
- Realtime: every change broadcasts the full card list to all WebSocket clients.
- Check it works: open two tabs and drag a card in one. It should move in the other.
