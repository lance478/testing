import { useState } from 'react';
import { useBoard } from './useBoard.js';

const COLUMNS = [
  { key: 'todo', label: 'To do', color: '#6366f1' },
  { key: 'doing', label: 'In progress', color: '#f59e0b' },
  { key: 'done', label: 'Done', color: '#10b981' },
];

function Column({ col, cards, onDrop, onAdd, onDelete }) {
  const [over, setOver] = useState(false);
  const [title, setTitle] = useState('');

  // Drop position: midway between neighbours of the card we hover over, or after the last.
  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    const id = Number(e.dataTransfer.getData('text/plain'));
    const items = [...e.currentTarget.querySelectorAll('[data-pos]')];
    const idx = items.findIndex((el) => e.clientY < el.getBoundingClientRect().top + el.offsetHeight / 2);
    const pos = (i) => Number(items[i]?.dataset.pos);
    let position;
    if (items.length === 0) position = 1;
    else if (idx === -1) position = pos(items.length - 1) + 1;
    else if (idx === 0) position = pos(0) - 1;
    else position = (pos(idx - 1) + pos(idx)) / 2;
    onDrop(id, col.key, position);
  };

  return (
    <section
      className={`column ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <header>
        <span className="dot" style={{ background: col.color }} />
        {col.label}
        <span className="count">{cards.length}</span>
      </header>
      {cards.map((c) => (
        <article
          key={c.id}
          className="card"
          data-pos={c.position}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('text/plain', String(c.id))}
          style={{ borderLeftColor: col.color }}
        >
          <span>{c.title}</span>
          <button aria-label="Delete card" onClick={() => onDelete(c.id)}>×</button>
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) onAdd(title, col.key);
          setTitle('');
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="+ Add a card" />
      </form>
    </section>
  );
}

export default function App() {
  const { cards, online, connected, addCard, moveCard, deleteCard } = useBoard();

  return (
    <main>
      <div className="topbar">
        <h1>Realtime Kanban</h1>
        <div className={`status ${connected ? 'live' : ''}`}>
          <span className="pulse" />
          {connected ? `Live · ${online} online` : 'Reconnecting…'}
        </div>
      </div>
      <p className="hint">Open this page in two tabs. Drag a card in one and watch it move in the other.</p>
      <div className="board">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            col={col}
            cards={cards.filter((c) => c.col === col.key).sort((a, b) => a.position - b.position)}
            onDrop={moveCard}
            onAdd={addCard}
            onDelete={deleteCard}
          />
        ))}
      </div>
    </main>
  );
}
