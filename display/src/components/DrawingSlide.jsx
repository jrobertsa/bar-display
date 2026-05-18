import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || '';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function DrawingSlide({ slide }) {
  const [result, setResult] = useState(undefined); // undefined = loading

  useEffect(() => {
    fetch(`${API}/api/drawings/results/latest`)
      .then(r => r.json())
      .then(data => setResult(data))
      .catch(() => setResult(null));

    const socket = io(API);
    socket.on('drawing_winner',    data => setResult(data));
    socket.on('drawing_no_winner', data => setResult(data));
    return () => socket.disconnect();
  }, []);

  const isRecent = result && result.drawn_at &&
    (Date.now() - new Date(result.drawn_at).getTime()) < SEVEN_DAYS_MS;

  const center = {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#0a0a0a', textAlign: 'center', padding: 48,
    color: '#fff',
  };

  if (result === undefined) return <div style={center} />;

  // Winner
  if (isRecent && !result.no_winner) {
    const firstName = (result.winner_name || '').split(' ')[0];
    const drawDate  = new Date(result.drawn_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return (
      <div style={center}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🏆</div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: '#f0c040', marginBottom: 8 }}>
          WE HAVE A WINNER
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, marginBottom: 4 }}>{firstName}</div>
        {result.ticket_number && (
          <div style={{ fontSize: 24, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
            Ticket #{result.ticket_number}
          </div>
        )}
        <div style={{ fontSize: 48, fontWeight: 300, color: '#f0c040', marginBottom: 16 }}>
          ${Number(result.prize_amount).toFixed(2)}
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          {result.drawing_name}  ·  {drawDate}
        </div>
        {result.rollover_amount > 0 && (
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
            Rollover to next drawing: ${Number(result.rollover_amount).toFixed(2)}
          </div>
        )}
      </div>
    );
  }

  // No winner / pool rolls over
  if (isRecent && result.no_winner) {
    return (
      <div style={center}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎲</div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: '#f0c040', marginBottom: 8 }}>
          POOL ROLLS OVER
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
          No winner this round
        </div>
        <div style={{ fontSize: 42, fontWeight: 700, color: '#f0c040', marginBottom: 8 }}>
          Next pool: ${Number(result.rollover_amount).toFixed(2)}
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>
          {result.drawing_name}
        </div>
      </div>
    );
  }

  // No recent result — show upcoming drawing info
  const drawDate = slide?.draw_date
    ? new Date(slide.draw_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={center}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🎰</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: '#f0c040', marginBottom: 12 }}>
        {slide?.title || 'ENTER TO WIN'}
      </div>
      {drawDate && (
        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          Next draw: {drawDate}
        </div>
      )}
      <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
        Enter at the bar to win!
      </div>
    </div>
  );
}
