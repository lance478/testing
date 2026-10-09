import { useEffect, useState } from 'react';

// Live board state: the server pushes the full card list over a WebSocket after every change.
export function useBoard() {
  const [cards, setCards] = useState([]);
  const [online, setOnline] = useState(1);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws;
    let retry;
    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'cards') setCards(msg.cards);
        if (msg.type === 'online') setOnline(msg.count);
      };
      ws.onclose = () => {
        setConnected(false);
        retry = setTimeout(connect, 1500);
      };
    };
    connect();
    return () => {
      clearTimeout(retry);
      ws.onclose = null;
      ws.close();
    };
  }, []);

  const api = (path, method, body) =>
    fetch(`/api/cards${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });

  return {
    cards,
    online,
    connected,
    addCard: (title, col) => api('', 'POST', { title, col }),
    moveCard: (id, col, position) => {
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, col, position } : c))); // optimistic
      return api(`/${id}`, 'PATCH', { col, position });
    },
    deleteCard: (id) => api(`/${id}`, 'DELETE'),
  };
}
