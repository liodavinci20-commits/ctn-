import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { supabase } from '../supabaseClient';

const TYPE_ICON  = { info: '◉', warn: '⚑', success: '✓' };
const ROLE_LABEL = { enseignant: 'Enseignant', conseiller: 'Conseiller Pédagogique', admin: 'Administrateur' };

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, loading, unreadCountFor, sendNotification, markAllRead, markOneRead } = useNotifications();

  const [recipients, setRecipients] = useState([]);
  const [to, setTo]                 = useState('');
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [type, setType]             = useState('info');
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);

  // Charge les vrais utilisateurs depuis profiles (tous sauf soi-même)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('id, nom, prenom, role')
      .neq('id', user.id)
      .eq('is_active', true)
      .then(({ data }) => setRecipients(data || []));
  }, [user?.id]);

  const unreadCount = unreadCountFor();

  const handleOpenNotif = (n) => {
    markOneRead(n.id);
    setSelectedNotif(n);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!to || !title.trim() || !body.trim()) return;
    setSending(true);
    try {
      await sendNotification({ toUserId: to, title: title.trim(), body: body.trim(), type });
      setTo(''); setTitle(''); setBody(''); setType('info');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>◉ Centre de Notifications</h3>
        <p>Alertes, rappels et messages du système</p>
      </div>

      <div className="grid-6-4">

        {/* ── Liste ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">✦ Mes notifications ({notifications.length})</div>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                ✓ Tout marquer lu
              </button>
            )}
          </div>

          {loading && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Chargement…
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: '14px' }}>
              Aucune notification pour l'instant.
            </div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${!n.read ? 'notif-unread' : ''}`}
              onClick={() => handleOpenNotif(n)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`notif-av ${n.type}`}>{TYPE_ICON[n.type] || '◉'}</div>
              <div style={{ flex: 1 }}>
                <div className="notif-title">{n.title}</div>
                <div className="notif-body">{n.body}</div>
                <div className="notif-time">
                  {n.fromName && <span style={{ fontWeight: 600 }}>{n.fromName} · </span>}
                  {new Date(n.time).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
              {!n.read && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--coral)', alignSelf: 'center', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── Formulaire d'envoi ── */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '14px' }}>✦ Envoyer un message</div>
            {sent && (
              <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                <span className="alert-emo">✓</span>
                <div><div className="alert-title">Notification envoyée.</div></div>
              </div>
            )}
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              <select className="form-input" value={to} onChange={e => setTo(e.target.value)} required>
                <option value="">— Destinataire —</option>
                {recipients.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.prenom} {r.nom} · {ROLE_LABEL[r.role] || r.role}
                  </option>
                ))}
              </select>

              <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                <option value="info">◉ Information</option>
                <option value="warn">⚑ Alerte</option>
                <option value="success">✓ Confirmation</option>
              </select>

              <input
                className="form-input"
                placeholder="Objet du message"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
              <textarea
                className="form-input"
                placeholder="Contenu du message…"
                value={body}
                onChange={e => setBody(e.target.value)}
                required
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              <button className="btn btn-navy" type="submit" disabled={sending}>
                {sending ? 'Envoi…' : '◉ Envoyer'}
              </button>
            </form>
          </div>

          {/* ── Résumé ── */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>⚑ Résumé</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text2)', fontSize: '13px' }}>Non lues</span>
                <span className={`badge badge-${unreadCount > 0 ? 'danger' : 'neutral'}`}>{unreadCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text2)', fontSize: '13px' }}>Total reçues</span>
                <span className="badge badge-info">{notifications.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal détail ── */}
      {selectedNotif && (
        <div className="modal-overlay open" onClick={() => setSelectedNotif(null)} style={{ zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{TYPE_ICON[selectedNotif.type]} {selectedNotif.title}</h3>
              <button className="modal-close" onClick={() => setSelectedNotif(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text1)', lineHeight: 1.6, marginBottom: '16px' }}>
                {selectedNotif.body}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text3)' }}>
                {selectedNotif.fromName && <div><strong>De :</strong> {selectedNotif.fromName} ({ROLE_LABEL[selectedNotif.fromRole] || selectedNotif.fromRole})</div>}
                <div><strong>Reçu :</strong> {new Date(selectedNotif.time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-navy" onClick={() => setSelectedNotif(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
