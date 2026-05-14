import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSessions } from '../context/SessionsContext';
import { supabase } from '../supabaseClient';

export default function ConseillerPage() {
  const { openRattrapage } = useOutletContext() || {};
  const { sessions }       = useSessions();

  const [teachers,     setTeachers]     = useState([]);
  const [progressions, setProgressions] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const [teachersRes, progRes, fichesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nom, prenom, matricule, is_active')
        .eq('role', 'enseignant')
        .order('nom'),

      supabase
        .from('progression_avancement')
        .select('teacher_id, done, total, classe_nom, annee, updated_at'),

      supabase
        .from('fiches_progression_contenu')
        .select('teacher_id, classe_id, classe_nom, annee, lignes'),
    ]);

    setTeachers(teachersRes.data || []);

    // 1. Groupement depuis progression_avancement (source principale)
    const byTeacher = {};
    (progRes.data || []).forEach(row => {
      if (!byTeacher[row.teacher_id]) {
        byTeacher[row.teacher_id] = { done: 0, total: 0, classes: [] };
      }
      byTeacher[row.teacher_id].done  += row.done  || 0;
      byTeacher[row.teacher_id].total += row.total || 0;
      byTeacher[row.teacher_id].classes.push({
        nom:   row.classe_nom,
        done:  row.done  || 0,
        total: row.total || 0,
        pct:   row.total > 0 ? Math.round(((row.done || 0) / row.total) * 100) : null,
        annee: row.annee,
      });
    });

    // 2. Fallback : calculer depuis fiches_progression_contenu pour les enseignants absents
    (fichesRes.data || []).forEach(row => {
      if (byTeacher[row.teacher_id]) return; // deja dans progression_avancement
      const lignes = Array.isArray(row.lignes) ? row.lignes : [];
      const total  = lignes.length;
      const done   = lignes.filter(l => l.fait).length;
      if (total === 0) return;
      if (!byTeacher[row.teacher_id]) {
        byTeacher[row.teacher_id] = { done: 0, total: 0, classes: [] };
      }
      byTeacher[row.teacher_id].done  += done;
      byTeacher[row.teacher_id].total += total;
      byTeacher[row.teacher_id].classes.push({
        nom:   row.classe_nom || '—',
        done,
        total,
        pct:   total > 0 ? Math.round((done / total) * 100) : null,
        annee: row.annee,
      });
    });

    Object.keys(byTeacher).forEach(id => {
      const { done, total } = byTeacher[id];
      byTeacher[id].pct = total > 0 ? Math.round((done / total) * 100) : null;
    });

    setProgressions(byTeacher);
    setLoading(false);
  };

  // Stats par enseignant depuis la progression dynamique
  const teacherStats = teachers.map(t => {
    const prog  = progressions[t.id];
    const pct   = prog?.pct ?? null;
    const done  = prog?.done  ?? 0;
    const total = prog?.total ?? 0;
    const classes = prog?.classes ?? [];
    const isLate  = pct === null || pct < 50;

    return {
      ...t,
      name:        `${t.prenom} ${t.nom}`,
      pct,
      done,
      total,
      classes,
      isLate,
      status:      pct === null ? 'Pas de fiche' : pct >= 75 ? 'En avance' : isLate ? 'En retard' : 'En cours',
      statusBadge: pct === null ? 'neutral'      : pct >= 75 ? 'success'   : isLate ? 'danger'    : 'warning',
      progColor:   pct === null ? 'blue'         : pct >= 75 ? 'teal'      : isLate ? 'coral'     : 'gold',
    };
  });

  const filtered = teacherStats.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const lateTeachers = teacherStats.filter(t => t.isLate && t.total > 0);
  const withData     = teacherStats.filter(t => t.pct !== null);
  const avgProg      = withData.length > 0
    ? Math.round(withData.reduce((s, t) => s + t.pct, 0) / withData.length)
    : 0;

  const teacherName = (id) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.prenom} ${t.nom}` : '—';
  };

  const recentSessions = [...sessions].slice(0, 10);

  const [expanded, setExpanded] = useState(null);

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>Vue Conseiller Pedagogique</h3>
        <p>Suivi des fiches de progression · Lycee General — 2024-2025</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <span className="stat-emo">✦</span>
          <div className="stat-value">{teachers.length}</div>
          <div className="stat-label">Enseignants suivis</div>
        </div>
        <div className="stat-card gold">
          <span className="stat-emo">◉</span>
          <div className="stat-value">
            {avgProg}<span style={{ fontSize: '16px', fontWeight: 400 }}>%</span>
          </div>
          <div className="stat-label">Avancement moyen</div>
          <div className="stat-trend">Basé sur les fiches de progression</div>
        </div>
        <div className="stat-card coral">
          <span className="stat-emo">⚑</span>
          <div className="stat-value">{lateTeachers.length}</div>
          <div className="stat-label">En retard (&lt; 50%)</div>
          {lateTeachers.length > 0 && (
            <div className="stat-trend down">Action requise</div>
          )}
        </div>
        <div className="stat-card teal">
          <span className="stat-emo">◎</span>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Seances enregistrees</div>
          <div className="stat-trend up">En temps reel</div>
        </div>
      </div>

      <div className="grid-6-4" style={{ marginBottom: '20px' }}>

        {/* Tableau suivi progression */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">◉ Suivi de progression par enseignant</div>
              <div className="card-subtitle">
                Avancement des fiches de progression (semaines cochees / total planifiees)
              </div>
            </div>
            <div className="search-bar" style={{ width: '220px' }}>
              <span className="search-icon">⊹</span>
              <input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              {search ? `Aucun resultat pour "${search}"` : 'Aucun enseignant enregistre.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Enseignant</th>
                  <th>Semaines effectuees</th>
                  <th>Progression globale</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <React.Fragment key={t.id}>
                    <tr>
                      <td>
                        <strong>{t.name}</strong>
                        {t.matricule && (
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{t.matricule}</div>
                        )}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text2)' }}>
                        {t.total > 0 ? `${t.done} / ${t.total}` : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar" style={{ width: '80px' }}>
                            <div
                              className={`progress-fill ${t.progColor}`}
                              style={{ width: `${t.pct ?? 0}%` }}
                            />
                          </div>
                          <span style={{
                            fontSize: '11px',
                            color: t.pct === null ? 'var(--text3)'
                              : t.pct < 50 ? 'var(--coral)'
                              : t.pct >= 75 ? 'var(--teal)'
                              : 'var(--text2)',
                            fontWeight: t.pct !== null ? 700 : 400,
                          }}>
                            {t.pct !== null ? `${t.pct}%` : '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${t.statusBadge}`}>{t.status}</span>
                      </td>
                      <td>
                        {t.classes.length > 0 && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                            style={{ fontSize: '10px' }}
                          >
                            {expanded === t.id ? 'Reduire' : 'Detail'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Detail par classe */}
                    {expanded === t.id && t.classes.map((cls, i) => (
                      <tr key={i} style={{ background: '#fafafe' }}>
                        <td colSpan={1} style={{ paddingLeft: '32px', fontSize: '12px', color: 'var(--text3)' }}>
                          {cls.nom}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text2)' }}>
                          {cls.done} / {cls.total}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="progress-bar" style={{ width: '80px' }}>
                              <div
                                className="progress-fill blue"
                                style={{ width: `${cls.pct ?? 0}%` }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                              {cls.pct !== null ? `${cls.pct}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{cls.annee}</span>
                        </td>
                        <td />
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Enseignants en retard */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>
              Enseignants en retard
            </div>
            {lateTeachers.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--teal)', fontSize: '13px' }}>
                Tous les enseignants sont a jour.
              </div>
            ) : (
              lateTeachers.map(t => (
                <div className="rattrapage-item" key={t.id}>
                  <div className="rattrapage-dot" style={{ background: 'var(--coral)' }} />
                  <div className="rattrapage-text">
                    <strong>{t.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block' }}>
                      {t.total > 0
                        ? `${t.done} / ${t.total} semaines — ${t.pct}%`
                        : 'Aucune fiche deposee'}
                    </span>
                  </div>
                  <button className="rattrapage-btn" onClick={openRattrapage}>Rattrapage</button>
                </div>
              ))
            )}
          </div>

          {/* Actions rapides */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>Actions rapides</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-navy" onClick={openRattrapage} style={{ justifyContent: 'center' }}>
                Planifier des rattrapages
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline des dernières séances */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Dernieres seances enregistrees</div>
            <div className="card-subtitle">Toutes classes confondues · temps reel</div>
          </div>
        </div>

        {recentSessions.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
            Aucune seance enregistree pour l'instant.
          </div>
        ) : (
          <div className="timeline">
            {recentSessions.map(s => (
              <div className="tl-item" key={s.id}>
                <div className="tl-dot done" />
                <div className="tl-date">{s.date} · {s.classe || '—'}</div>
                <div className="tl-title">{s.title}</div>
                <div className="tl-desc">
                  {teacherName(s.teacherId)}
                  {s.matiere ? ` · ${s.matiere}` : ''}
                  {s.signature ? ' · Signe' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
