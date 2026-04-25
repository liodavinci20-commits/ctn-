import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSessions } from '../context/SessionsContext';
import { supabase } from '../supabaseClient';

const TARGET_SESSIONS = 20; // objectif de séances par trimestre

export default function ConseillerPage() {
  const { openRattrapage } = useOutletContext() || {};
  const { sessions }       = useSessions();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, nom, prenom, matricule, is_active')
      .eq('role', 'enseignant')
      .order('nom');
    setTeachers(data || []);
    setLoading(false);
  };

  // Enrichit chaque enseignant avec ses stats de sessions
  const teacherStats = teachers.map(t => {
    const mySessions = sessions.filter(s => s.teacherId === t.id);
    const prog       = Math.min(Math.round((mySessions.length / TARGET_SESSIONS) * 100), 100);
    const isLate     = prog < 50;
    return {
      ...t,
      name:          `${t.prenom} ${t.nom}`,
      sessionsCount: mySessions.length,
      prog,
      isLate,
      status:      isLate ? '⚑ Retard' : prog >= 80 ? '✓ À jour' : '◉ Correct',
      statusBadge: isLate ? 'danger'   : prog >= 80 ? 'success'  : 'warning',
      progColor:   isLate ? 'coral'    : prog >= 80 ? 'teal'     : 'blue',
    };
  });

  const filtered     = teacherStats.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const lateTeachers = teacherStats.filter(t => t.isLate);
  const avgProg      = teacherStats.length > 0
    ? Math.round(teacherStats.reduce((s, t) => s + t.prog, 0) / teacherStats.length)
    : 0;

  // 10 dernières séances toutes classes confondues
  const recentSessions = [...sessions].slice(0, 10);

  // Nom d'un enseignant depuis son id
  const teacherName = (id) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.prenom} ${t.nom}` : '—';
  };

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>✶ Vue Conseiller Pédagogique</h3>
        <p>Tableau de bord global · Lycée Général — Année 2024–2025</p>
      </div>

      {/* Stats en temps réel */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <span className="stat-emo">✦</span>
          <div className="stat-value">{teachers.length}</div>
          <div className="stat-label">Enseignants suivis</div>
        </div>
        <div className="stat-card gold">
          <span className="stat-emo">◉</span>
          <div className="stat-value">{avgProg}<span style={{ fontSize: '16px', fontWeight: 400 }}>%</span></div>
          <div className="stat-label">Progression moyenne</div>
        </div>
        <div className="stat-card coral">
          <span className="stat-emo">⚑</span>
          <div className="stat-value">{lateTeachers.length}</div>
          <div className="stat-label">Enseignants en retard</div>
          {lateTeachers.length > 0 && <div className="stat-trend down">▼ Action requise</div>}
        </div>
        <div className="stat-card teal">
          <span className="stat-emo">◎</span>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Séances enregistrées</div>
          <div className="stat-trend up">▲ En temps réel</div>
        </div>
      </div>

      <div className="grid-6-4" style={{ marginBottom: '20px' }}>

        {/* Tableau suivi enseignants */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">◉ Suivi de progression par enseignant</div>
              <div className="card-subtitle">Sessions réalisées / objectif {TARGET_SESSIONS} par trimestre</div>
            </div>
            <div className="search-bar" style={{ width: '220px' }}>
              <span className="search-icon">⊹</span>
              <input
                placeholder="Rechercher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Chargement des enseignants…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              {search ? `Aucun résultat pour « ${search} »` : 'Aucun enseignant enregistré.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Enseignant</th><th>Séances</th><th>Progression</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.name}</strong>
                      {t.matricule && <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{t.matricule}</div>}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text2)' }}>
                      {t.sessionsCount} / {TARGET_SESSIONS}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress-bar" style={{ width: '80px' }}>
                          <div className={`progress-fill ${t.progColor}`} style={{ width: `${t.prog}%` }} />
                        </div>
                        <span style={{ fontSize: '11px', color: t.isLate ? 'var(--coral)' : 'var(--text3)' }}>
                          {t.prog}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${t.statusBadge}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Alertes retard */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>⚑ Enseignants en retard</div>
            {lateTeachers.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--teal)', fontSize: '13px' }}>
                ✓ Tous les enseignants sont à jour.
              </div>
            ) : (
              lateTeachers.map(t => (
                <div className="rattrapage-item" key={t.id}>
                  <div className="rattrapage-dot" style={{ background: 'var(--coral)' }} />
                  <div className="rattrapage-text">
                    <strong>{t.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block' }}>
                      {t.sessionsCount} séance(s) · {t.prog}% de progression
                    </span>
                  </div>
                  <button className="rattrapage-btn" onClick={openRattrapage}>Rattrapage</button>
                </div>
              ))
            )}
          </div>

          {/* Actions rapides */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>✦ Actions rapides</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-navy" onClick={openRattrapage} style={{ justifyContent: 'center' }}>
                ⚑ Planifier des rattrapages
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>
                ◎ Exporter le rapport PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline des dernières séances */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">✦ Dernières séances enregistrées</div>
            <div className="card-subtitle">Toutes classes confondues · temps réel</div>
          </div>
        </div>

        {recentSessions.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
            Aucune séance enregistrée pour l'instant.
          </div>
        ) : (
          <div className="timeline">
            {recentSessions.map(s => (
              <div className="tl-item" key={s.id}>
                <div className="tl-dot done" />
                <div className="tl-date">
                  {s.date} · {s.classe || '—'}
                </div>
                <div className="tl-title">{s.title}</div>
                <div className="tl-desc">
                  {teacherName(s.teacherId)}
                  {s.matiere ? ` · ${s.matiere}` : ''}
                  {s.competences?.length > 0 ? ` · ${s.competences.slice(0, 2).join(', ')}` : ''}
                  {s.signature ? ' · ✓ Signé' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
