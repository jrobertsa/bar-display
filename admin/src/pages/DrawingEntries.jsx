import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toast, useToast } from '../components/Toast';

const API = import.meta.env.VITE_API_URL || '';

const maskPhone = (phone) => `***-***-${String(phone).slice(-4)}`;

export default function DrawingEntries({ id, navigate }) {
  const [drawing, setDrawing]       = useState(null);
  const [entries, setEntries]       = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult]         = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [qrData, setQrData]         = useState(null);
  const [showQR, setShowQR]         = useState(false);
  const [drawing_in_progress, setDrawingInProgress] = useState(false);
  const { toast, showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [dRes, eRes] = await Promise.all([
        axios.get(`${API}/api/drawings/${id}`),
        axios.get(`${API}/api/drawings/${id}/entries`),
      ]);
      setDrawing(dRes.data);
      setEntries(eRes.data);
    } catch { /* silent */ }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePay = async (entryId) => {
    try {
      await axios.put(`${API}/api/drawings/${id}/entries/${entryId}/pay`);
      fetchData();
    } catch { showToast('Update failed', 'error'); }
  };

  const handleDraw = async () => {
    setShowConfirm(false);
    setDrawingInProgress(true);
    try {
      const res = await axios.post(`${API}/api/drawings/${id}/draw`);
      setResult(res.data);
      setShowResult(true);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Draw failed', 'error');
    } finally {
      setDrawingInProgress(false);
    }
  };

  const loadQR = async () => {
    try {
      const res = await axios.get(`${API}/api/drawings/${id}/qrcode`);
      setQrData(res.data);
      setShowQR(true);
    } catch { showToast('Failed to generate QR code', 'error'); }
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR Code</title></head>
      <body style="text-align:center;padding:40px;font-family:sans-serif">
        <h2 style="margin-bottom:16px">${drawing?.name || 'Drawing'}</h2>
        <img src="${qrData.qrcode}" style="width:300px;height:300px" />
        <p style="margin-top:16px;font-size:14px;color:#666">${qrData.url}</p>
        <p style="font-size:13px;color:#999">Scan to enter the drawing</p>
      </body></html>`);
    win.print();
  };

  const paidCount = entries.filter(e => e.has_paid).length;
  const canDraw = drawing?.status === 'open' && paidCount > 0;

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={() => navigate('drawings')}>← Drawings</button>
        <div className="page-title" style={{ margin: 0, flex: 1 }}>
          {drawing?.name || '…'}
        </div>
        <button className="btn btn-sm" onClick={() => navigate('drawing-history', id)}>View History</button>
        <button className="btn btn-sm" onClick={loadQR}>Show QR Code</button>
      </div>

      {/* Stats */}
      {drawing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px 20px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f0c040' }}>
              ${Number(drawing.pool_total || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Pool Total</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px 20px' }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{entries.length}</div>
            <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Total Entries</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px 20px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>{paidCount}</div>
            <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Paid</div>
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Ticket #</th><th>Name</th><th>Phone</th><th>Entered</th><th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#71717a', padding: 32 }}>
                No entries yet
              </td></tr>
            )}
            {entries.map(e => (
              <tr key={e.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f0c040', fontSize: 15 }}>
                  {e.ticket_number || '—'}
                </td>
                <td style={{ fontWeight: 500 }}>{e.name}</td>
                <td style={{ color: '#71717a', fontFamily: 'monospace' }}>{maskPhone(e.phone)}</td>
                <td style={{ color: '#71717a', fontSize: 13 }}>
                  {new Date(e.entered_at).toLocaleString()}
                </td>
                <td>
                  <span
                    className={`badge ${e.has_paid ? 'badge-green' : 'badge-gray'}`}
                    style={{ cursor: 'pointer' }}
                    title="Click to toggle payment"
                    onClick={() => togglePay(e.id)}
                  >
                    {e.has_paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Draw button */}
      {drawing?.status === 'open' && (
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 18, padding: '14px 40px', opacity: canDraw ? 1 : 0.5 }}
            disabled={!canDraw || drawing_in_progress}
            onClick={() => setShowConfirm(true)}
          >
            {drawing_in_progress ? 'Drawing…' : '🎰 DRAW A NAME'}
          </button>
          {!canDraw && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#71717a' }}>
              {entries.length === 0 ? 'No entries yet' : 'At least one paid entry is required'}
            </div>
          )}
        </div>
      )}

      {drawing?.status === 'drawn' && (
        <div className="card" style={{ textAlign: 'center', color: '#71717a' }}>
          This drawing has been completed. <button className="btn btn-sm" style={{ marginLeft: 8 }}
            onClick={() => navigate('drawing-history', id)}>View Result</button>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-title">Confirm Draw</div>
            <p style={{ fontSize: 14, color: '#52525b', marginBottom: 8 }}>
              Are you sure? This will randomly select a winner from all entries. <strong>This cannot be undone.</strong>
            </p>
            <p style={{ fontSize: 13, color: '#71717a' }}>
              {entries.length} total entries · {paidCount} paid
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDraw}>Draw Now</button>
            </div>
          </div>
        </div>
      )}

      {/* Result modal */}
      {showResult && result && (
        <div className="modal-overlay" onClick={() => setShowResult(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            {result.no_winner ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
                <div className="modal-title">No Winner This Round</div>
                <p style={{ color: '#52525b', marginBottom: 8 }}>
                  <strong>{result.winner_name}</strong> was drawn but had not paid.
                </p>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f0c040', marginBottom: 4 }}>
                  Pool Rolls Over
                </div>
                <div style={{ color: '#71717a' }}>
                  ${Number(result.rollover_amount || 0).toFixed(2)} carries to next drawing
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                <div className="modal-title">We Have a Winner!</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                  {result.winner_name}
                </div>
                <div style={{ color: '#71717a', marginBottom: 4 }}>
                  {maskPhone(result.winner_phone)}
                </div>
                {result.ticket_number && (
                  <div style={{ fontFamily: 'monospace', fontSize: 18, color: '#f0c040', marginBottom: 12 }}>
                    Ticket #{result.ticket_number}
                  </div>
                )}
                <div style={{ fontSize: 32, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
                  ${Number(result.prize_amount).toFixed(2)}
                </div>
                {result.rollover_amount > 0 && (
                  <div style={{ fontSize: 14, color: '#71717a' }}>
                    ${Number(result.rollover_amount).toFixed(2)} rolls to next drawing
                  </div>
                )}
              </>
            )}
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowResult(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* QR modal */}
      {showQR && qrData && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="modal-title">Registration QR Code</div>
            <img src={qrData.qrcode} alt="QR Code" style={{ width: 260, height: 260, margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 13, color: '#71717a', wordBreak: 'break-all', marginBottom: 8 }}>
              {qrData.url}
            </p>
            <p style={{ fontSize: 13, color: '#52525b', marginBottom: 20 }}>
              Customers scan this to enter the drawing
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => setShowQR(false)}>Close</button>
              <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
