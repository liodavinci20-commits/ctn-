import React, { useState, useEffect } from 'react';
import EdtPage from './EdtPage';
import { useSessions } from '../context/SessionsContext';
import { useRattrapages } from '../context/RattrapagesContext';
import { useNotifications } from '../context/NotificationsContext';
import SessionDetailModal from '../components/modals/SessionDetailModal';
import ProgrammeManager from '../components/admin/ProgrammeManager';
import { supabase } from '../supabaseClient';

const ROLE_LABEL = { enseignant: 'Enseignant', conseiller: 'Conseiller', admin: 'Administrateur' };
const ROLE_BADGE = { enseignant: 'info', conseiller: 'neutral', admin: 'warning' };
const STATUS_LABELS = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
const STATUS_BADGE  = { pending: 'warning', approved: 'success', rejected: 'danger' };

export default function AdminPage() {
  const { sessions }                  = useSessions();
  const { rattrapages, updateStatus } = useRattrapages();
  const { sendNotification }          = useNotifications();

  const [profiles, setProfiles]         = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [search, setSearch]             = useState('');
  const [edtTeacherId, setEdtTeacherId] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [togglingId, setTogglingId]     = useState(null);
  const [actioningId, setActioningId]   = useState(null);

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, nom, prenom, email, role, matricule, is_active, created_at')
      .order('nom');
    setProfiles(data || []);
    setLoadingProfiles(false);
  };

  const toggleActive = async (profile) => {
    setTogglingId(profile.id);
    await supabase
      .from('profiles')
      .update({ is_active: !profile.is_active })
      .eq('id', profile.id);
    await fetchProfiles();
    setTogglingId(null);
  };

  const handleRattrapageAction = async (ratt, action) => {
    setActioningId(ratt.id);
    try {
      // 1. Met à jour le statut en base
      await updateStatus(ratt.id, action);

      // 2. Notifie l'enseignant du résultat
      await sendNotification({
        toUserId: ratt.teacherId,
        type:     action === 'approved' ? 'success' : 'warn',
        title:    `Rattrapage ${action === 'approved' ? 'approuvé ✓' : 'rejeté ✕'} · ${ratt.classe}`,
        body:     `Votre demande de rattrapage pour la classe ${ratt.classe} le ${ratt.date} (${ratt.creneau}) a été ${action === 'approved' ? 'approuvée' : 'rejetée'} par l'administration.`,
      });
    } catch (err) {
      console.error('Erreur action rattrapage:', err.message);
    } finally {
      setActioningId(null);
    }
  };

  // Données filtrées
  const filteredProfiles = profiles.filter(p => {
    const q = search.toLowerCase();
    return (
      `${p.prenom} ${p.nom}`.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.matricule?.toLowerCase().includes(q) ||
      ROLE_LABEL[p.role]?.toLowerCase().includes(q)
    );
  });

  const teachers       = profiles.filter(p => p.role === 'enseignant');
  const activeTeachers = profiles.filter(p => p.role === 'enseignant' && p.is_active);

  // Nom complet d'un enseignant depuis son id
  const teacherName = (id) => {
    const p = profiles.find(p => p.id === id);
    return p ? `${p.prenom} ${p.nom}` : id;
  };

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>⬥ Administration Générale</h3>
        <p>Gestion du système CTN · Lycée Général Leclerc · 2024–2025</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '28px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card blue">
          <span className="stat-emo">✦</span>
          <div className="stat-value">{activeTeachers.length}</div>
          <div className="stat-label">Enseignants actifs</div>
        </div>
        <div className="stat-card gold">
          <span className="stat-emo">◉</span>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Séances enregistrées</div>
        </div>
        <div className="stat-card teal">
          <span className="stat-emo">✶</span>
          <div className="stat-value">{profiles.length}</div>
          <div className="stat-label">Utilisateurs total</div>
        </div>
      </div>

      <div className="grid-2">
        {/* ── Gestion utilisateurs ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">✦ Gestion des utilisateurs</div>
            <span className="badge badge-info">{filteredProfiles.length} résultat(s)</span>
          </div>

          {/* Barre de recherche */}
          <div className="search-bar" style={{ marginBottom: '16px' }}>
            <span className="search-icon">⊹</span>
            <input
              placeholder="Rechercher par nom, email, matricule, rôle…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loadingProfiles ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Chargement des utilisateurs…
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              {search ? `Aucun résultat pour « ${search} »` : 'Aucun utilisateur trouvé.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>
                          {p.prenom} {p.nom}
                        </div>
                        {p.matricule && (
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.matricule}</div>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{p.email}</td>
                      <td>
                        <span className={`badge badge-${ROLE_BADGE[p.role] || 'neutral'}`}>
                          {ROLE_LABEL[p.role] || p.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${p.is_active ? 'success' : 'danger'}`}>
                          {p.is_active ? '✓ Actif' : '✕ Inactif'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: p.is_active ? 'var(--coral)' : 'var(--teal)', whiteSpace: 'nowrap' }}
                          onClick={() => toggleActive(p)}
                          disabled={togglingId === p.id}
                        >
                          {togglingId === p.id ? '…' : p.is_active ? '✕ Désactiver' : '✓ Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Contrôle des cahiers ── */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '16px' }}>◉ Cahiers de Textes récents</div>
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            <span className="alert-emo">✓</span>
            <div>
              <div className="alert-title">Surveillance en temps réel</div>
              <div className="alert-body">Horodatage et coordonnées GPS certifiés.</div>
            </div>
          </div>
          {sessions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)' }}>
              Aucune séance enregistrée.
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Enseignant</th><th>Matière</th><th></th></tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 20).map(s => (
                    <tr key={s.id}>
                      <td style={{ fontSize: '12px' }}>{s.date}</td>
                      <td><strong>{teacherName(s.teacherId)}</strong></td>
                      <td><span className="badge badge-info">{s.matiere}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSession(s)}>
                          ◎ Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Rattrapages ── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">⚑ Demandes de Rattrapages</div>
          {rattrapages.filter(r => r.status === 'pending').length > 0 && (
            <span className="badge badge-warning">
              {rattrapages.filter(r => r.status === 'pending').length} en attente
            </span>
          )}
        </div>
        {rattrapages.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: '14px' }}>
            Aucune demande de rattrapage.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Enseignant</th><th>Classe</th><th>Date</th><th>Motif</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {rattrapages.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.teacherName}</strong></td>
                  <td>{r.classe}</td>
                  <td style={{ fontSize: '12px' }}>{r.date}</td>
                  <td style={{ fontSize: '12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.motif}</td>
                  <td><span className={`badge badge-${STATUS_BADGE[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                  <td>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--teal)', fontWeight: 600 }}
                          onClick={() => handleRattrapageAction(r, 'approved')}
                          disabled={actioningId === r.id}
                        >
                          {actioningId === r.id ? '…' : '✓ Approuver'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--coral)', fontWeight: 600 }}
                          onClick={() => handleRattrapageAction(r, 'rejected')}
                          disabled={actioningId === r.id}
                        >
                          {actioningId === r.id ? '…' : '✕ Rejeter'}
                        </button>
                      </div>
                    )}
                    {r.status !== 'pending' && (
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                        {r.status === 'approved' ? '✓ Traité' : '✕ Rejeté'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── EDT enseignant ── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="card-title">✶ Emplois du Temps des enseignants</div>
            <div className="card-subtitle">Visualiser et corriger l'EDT de n'importe quel enseignant.</div>
          </div>
          <select
            className="form-input"
            style={{ width: '260px', cursor: 'pointer' }}
            value={edtTeacherId}
            onChange={e => setEdtTeacherId(e.target.value)}
          >
            <option value="">— Sélectionner un enseignant —</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.prenom} {t.nom}
              </option>
            ))}
          </select>
        </div>
        {edtTeacherId ? (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <EdtPage teacherIdProp={edtTeacherId} />
          </div>
        ) : (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text3)' }}>
            <span style={{ fontSize: '32px', opacity: 0.4 }}>✶</span>
            <p style={{ marginTop: '12px', fontSize: '14px' }}>Sélectionnez un enseignant pour voir son emploi du temps.</p>
          </div>
        )}
      </div>

      {/* ── Programme officiel ── */}
      <ProgrammeManager />

      <SessionDetailModal
        isOpen={selectedSession !== null}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
      />
    </div>
  );
}
