import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSessions } from '../context/SessionsContext';
import { useRattrapages } from '../context/RattrapagesContext';
import { useEdt } from '../context/EdtContext';
import { useReferenceData } from '../hooks/useReferenceData';
import { useNotifications } from '../context/NotificationsContext';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const JOURS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const JOURS_JS    = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function currentAnnee() {
  const now = new Date();
  const y = now.getFullYear();
  return (now.getMonth() + 1) >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function progressColor(pct) {
  if (pct >= 75) return 'teal';
  if (pct >= 40) return 'gold';
  return 'coral';
}

function heureEnMinutes(h) {
  if (!h) return 0;
  const [hh, mm] = h.replace('h', ':').split(':').map(Number);
  return hh * 60 + (mm || 0);
}

// Anime un nombre de 0 vers la cible — avec nettoyage propre
function useCounter(target, duration = 900) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) { setCount(0); return; }
    let cancelled = false;
    let rafId = null;
    let start = null;
    const step = (ts) => {
      if (cancelled) return;
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.round(progress * target));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => { cancelled = true; if (rafId) cancelAnimationFrame(rafId); };
  }, [target, duration]);
  return count;
}

function salutation() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function DashboardPage() {
  const { user }                            = useAuth();
  const { sessions, loading: loadingSess }  = useSessions();
  const { rattrapages }                     = useRattrapages();
  const { courses, getCoursesForTeacher }   = useEdt();
  const { myClasses }                       = useReferenceData(user?.id);
  const { unreadCountFor }                  = useNotifications();

  const unreadNotifs = unreadCountFor();

  // ── Progression par classe (depuis les coches de la fiche) ────
  const [progressionAvancement, setProgressionAvancement] = useState([]);
  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase
        .from('progression_avancement')
        .select('classe_id, classe_nom, done, total')
        .eq('teacher_id', user.id),
      supabase
        .from('fiches_progression_contenu')
        .select('classe_id, classe_nom, lignes')
        .eq('teacher_id', user.id),
    ]).then(([avRes, fichesRes]) => {
      const avData = avRes.data || [];

      // Fallback : classes présentes dans fiches mais absentes de progression_avancement
      const avClasseIds = new Set(avData.map(r => r.classe_id));
      const extra = [];
      (fichesRes.data || []).forEach(row => {
        if (avClasseIds.has(row.classe_id)) return;
        const lignes = Array.isArray(row.lignes) ? row.lignes : [];
        const total  = lignes.length;
        const done   = lignes.filter(l => l.fait).length;
        if (total > 0) extra.push({ classe_id: row.classe_id, classe_nom: row.classe_nom, done, total });
      });

      setProgressionAvancement([...avData, ...extra]);
    });
  }, [user?.id]);

  // ── Séances de l'enseignant ──────────────────────────────────
  const mySessions = useMemo(() =>
    sessions
      .filter(s => s.teacherId === user?.id)
      .sort((a, b) => new Date(b.dateCours) - new Date(a.dateCours)),
    [sessions, user?.id]
  );

  const recentSessions = mySessions.slice(0, 5);

  const thisWeekCount = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() - 7);
    return mySessions.filter(s => new Date(s.dateCours) >= limit).length;
  }, [mySessions]);

  const signedCount   = mySessions.filter(s => !!s.signature).length;
  const signedPct     = mySessions.length > 0
    ? Math.round((signedCount / mySessions.length) * 100)
    : 0;

  // ── Rattrapages ───────────────────────────────────────────────
  const pendingRattrapages = useMemo(() =>
    rattrapages.filter(r => r.teacherId === user?.id && r.status === 'pending'),
    [rattrapages, user?.id]
  );

  // ── Alertes ───────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list = [];
    pendingRattrapages.forEach(r => list.push({
      type:  'danger',
      emo:   '⚑',
      title: `Rattrapage en attente · ${r.classe}`,
      body:  `${r.motif} — proposé le ${new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`,
    }));
    mySessions.filter(s => !s.signature).slice(0, 2).forEach(s => list.push({
      type:  'warning',
      emo:   '◉',
      title: `Séance non signée · ${s.classe}`,
      body:  `${s.title} — ${s.date}`,
    }));
    return list.slice(0, 4);
  }, [pendingRattrapages, mySessions]);

  // ── Prochain cours ────────────────────────────────────────────
  const prochainCours = useMemo(() => {
    const myCourses = getCoursesForTeacher(user?.id);
    if (!myCourses.length) return null;
    const now       = new Date();
    const todayName = JOURS_JS[now.getDay()];
    const nowMin    = now.getHours() * 60 + now.getMinutes();
    const todayOrd  = JOURS_ORDER.indexOf(todayName);

    const todayCourses = myCourses
      .filter(c => c.day === todayName && heureEnMinutes(c.start) > nowMin)
      .sort((a, b) => heureEnMinutes(a.start) - heureEnMinutes(b.start));
    if (todayCourses.length) return { ...todayCourses[0], label: "Aujourd'hui" };

    for (let i = 1; i <= 6; i++) {
      const nextName = JOURS_ORDER[(todayOrd + i) % 7];
      const found = myCourses
        .filter(c => c.day === nextName)
        .sort((a, b) => heureEnMinutes(a.start) - heureEnMinutes(b.start));
      if (found.length) return { ...found[0], label: nextName };
    }
    return null;
  }, [courses, user?.id]);

  // ── Compteurs animés ──────────────────────────────────────────
  const cntSessions  = useCounter(mySessions.length);
  const cntClasses   = useCounter(myClasses.length);
  const cntPending   = useCounter(pendingRattrapages.length);
  const cntNotifs    = useCounter(unreadNotifs);
  const cntSignedPct = useCounter(signedPct);

  const classesLabel = myClasses.slice(0, 3).map(c => c.nom).join(' · ')
    + (myClasses.length > 3 ? '…' : '');

  const weekTrend = thisWeekCount > 0 ? 'up' : '';

  return (
    <div className="page active fade-in">

      {/* ── BANDEAU DE BIENVENUE ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--navy) 0%, #1a3a6e 100%)',
        borderRadius: '16px', padding: '20px 24px', marginBottom: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: '"Syne", sans-serif' }}>
            {salutation()}, {user?.name?.split(' ')[0] || 'Enseignant'} 👋
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            {user?.role === 'enseignant'
              ? mySessions.length === 0
                ? 'Commencez par saisir votre première séance.'
                : `${thisWeekCount > 0 ? `${thisWeekCount} séance${thisWeekCount > 1 ? 's' : ''} cette semaine` : 'Aucune séance cette semaine'} · ${signedPct}% des séances signées`
              : `${sessions.length} séance${sessions.length > 1 ? 's' : ''} enregistrée${sessions.length > 1 ? 's' : ''} dans le système`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {user?.role === 'enseignant' && (
            <Link to="/saisie" className="btn btn-gold btn-sm" style={{ whiteSpace: 'nowrap' }}>
              ✦ Nouvelle séance
            </Link>
          )}
          {unreadNotifs > 0 && (
            <Link to="/notifications" className="btn btn-ghost btn-sm"
              style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
              🔔 {unreadNotifs} non lu{unreadNotifs > 1 ? 'es' : ''}
            </Link>
          )}
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div className="stats-grid" style={{ marginBottom: '12px' }}>
        <div className="stat-card blue fade-in-1">
          <span className="stat-emo">✦</span>
          <div className="stat-value">{loadingSess ? '…' : cntSessions}</div>
          <div className="stat-label">Séances documentées</div>
          <div className={`stat-trend ${weekTrend}`}>
            {thisWeekCount > 0
              ? `${weekTrend === 'up' ? '▲' : weekTrend === 'down' ? '▼' : '◈'} +${thisWeekCount} cette semaine`
              : '◈ Aucune cette semaine'}
          </div>
        </div>

        <div className="stat-card gold fade-in-2">
          <span className="stat-emo">✓</span>
          <div className="stat-value">
            {loadingSess ? '…' : cntSignedPct}
            <span style={{ fontSize: '16px', fontWeight: 400 }}>%</span>
          </div>
          <div className="stat-label">Séances signées</div>
          <div className={`stat-trend ${signedPct >= 80 ? 'up' : signedPct >= 50 ? '' : 'down'}`}>
            {signedPct >= 80 ? '▲ Excellent taux'
              : signedPct >= 50 ? '◈ En bonne voie'
              : '▼ Séances à signer'}
          </div>
        </div>

        <div className="stat-card teal fade-in-3">
          <span className="stat-emo">✶</span>
          <div className="stat-value">{cntClasses}</div>
          <div className="stat-label">Classes en charge</div>
          <div className="stat-trend">
            {classesLabel || '◈ Configurer le profil'}
          </div>
        </div>

        <div className="stat-card coral fade-in-4">
          <span className="stat-emo">⚑</span>
          <div className="stat-value">{cntPending}</div>
          <div className="stat-label">Rattrapages en attente</div>
          <div className={`stat-trend ${pendingRattrapages.length > 0 ? 'down' : 'up'}`}>
            {pendingRattrapages.length > 0 ? '▼ Action requise' : '▲ Aucun retard'}
          </div>
        </div>
      </div>


      <div className="grid-7-3" style={{ marginBottom: '12px' }}>

        {/* ── SÉANCES RÉCENTES ── */}
        <div className="card fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">✦ Mes séances récentes</div>
              <div className="card-subtitle">Dernières entrées du cahier</div>
            </div>
            <Link to="/historique" className="btn btn-ghost btn-sm">Voir tout ›</Link>
          </div>

          {loadingSess && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>◎</div>
              <div>Chargement des séances…</div>
            </div>
          )}

          {!loadingSess && recentSessions.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>◎</div>
              <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '12px' }}>
                Aucune séance enregistrée pour l'instant.
              </p>
              {user?.role === 'enseignant' && (
                <Link to="/saisie" className="btn btn-navy btn-sm" style={{ display: 'inline-flex' }}>
                  ✦ Saisir ma première séance
                </Link>
              )}
            </div>
          )}

          {!loadingSess && recentSessions.map((s, i) => {
            const d      = new Date(s.dateCours);
            const jour   = d.getDate();
            const mois   = d.toLocaleDateString('fr-FR', { month: 'short' });
            const signed = !!s.signature;

            return (
              <div key={s.id}
                className="seance-preview"
                style={{
                  borderBottom: i < recentSessions.length - 1 ? '1px solid var(--border2)' : 'none',
                  paddingBottom: '16px', marginBottom: '16px',
                }}>
                <div className="sp-header">
                  <div className="sp-date" style={{ background: signed ? 'var(--navy)' : 'var(--coral)' }}>
                    <div className="sp-date-d">{jour}</div>
                    <div className="sp-date-m">{mois}</div>
                  </div>
                  <div className="sp-meta" style={{ flex: 1 }}>
                    <h4>{s.title || '(Sans titre)'}</h4>
                    <p>
                      {[s.classe, s.typeSeance, user?.name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`badge ${signed ? 'badge-success' : 'badge-danger'}`}>
                    {signed ? '✓ Signé' : '⚑ Non signé'}
                  </span>
                </div>

                {(s.content || s.competences?.length > 0) && (
                  <div className="sp-body">
                    {s.content && (
                      <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: s.competences?.length ? '8px' : 0 }}>
                        {s.content.length > 160 ? s.content.slice(0, 160) + '…' : s.content}
                      </p>
                    )}
                    {s.competences?.length > 0 && (
                      <div className="sp-tags">
                        {s.competences.slice(0, 3).map((c, j) => (
                          <span key={j} className={j === 0 ? 'badge badge-info' : 'badge badge-neutral'}>{c}</span>
                        ))}
                        {s.competences.length > 3 && (
                          <span className="badge badge-neutral">+{s.competences.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── COLONNE DROITE ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Progression par classe */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">◉ Progression par classe</div>
              <Link to="/progression" className="btn btn-ghost btn-sm">Gérer ›</Link>
            </div>
            {myClasses.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text3)', padding: '8px 0' }}>
                Aucune classe dans votre profil.{' '}
                <Link to="/profil" style={{ color: 'var(--navy)', fontWeight: 600 }}>Configurer →</Link>
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myClasses.slice(0, 4).map((c) => {
                  const av  = progressionAvancement.find(p => p.classe_id === c.id)
                           || progressionAvancement.find(p => p.classe_nom === c.nom);
                  const pct = av?.total > 0 ? Math.round((av.done / av.total) * 100) : null;
                  const col = pct !== null ? progressColor(pct) : 'blue';

                  return (
                    <div key={c.id}>
                      <div className="progress-label">
                        <span>{c.nom}</span>
                        <span style={{
                          fontSize: '11px',
                          color: pct !== null ? 'var(--navy)' : 'var(--text3)',
                          fontWeight: pct !== null ? 700 : 400,
                        }}>
                          {pct !== null ? `${pct}%` : '—'}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${col}`} style={{ width: `${pct ?? 0}%`, transition: 'width 0.6s ease' }} />
                      </div>
                      {av?.total > 0 && (
                        <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '2px' }}>
                          {av.done} / {av.total} semaines effectuées
                        </div>
                      )}
                      {!av && (
                        <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '2px', fontStyle: 'italic' }}>
                          Fiche non encore déposée
                        </div>
                      )}
                    </div>
                  );
                })}
                {myClasses.length > 4 && (
                  <Link to="/progression" style={{ fontSize: '11px', color: 'var(--navy)', fontWeight: 600 }}>
                    Voir les {myClasses.length - 4} autre{myClasses.length - 4 > 1 ? 's' : ''} classe{myClasses.length - 4 > 1 ? 's' : ''} →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Alertes */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⚑ Alertes</div>
              {alerts.length > 0 && (
                <span style={{
                  background: 'var(--coral)', color: '#fff',
                  borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 700,
                }}>
                  {alerts.length}
                </span>
              )}
            </div>
            {alerts.length === 0 ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', background: 'rgba(26,140,122,0.06)',
                borderRadius: '8px', border: '1px solid rgba(26,140,122,0.2)',
              }}>
                <span style={{ fontSize: '16px' }}>✓</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--teal)' }}>Tout est en ordre</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Aucune alerte en cours.</div>
                </div>
              </div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className={`alert alert-${a.type}`} style={{ marginBottom: i < alerts.length - 1 ? '8px' : 0 }}>
                  <span className="alert-emo">{a.emo}</span>
                  <div>
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-body">{a.body}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Prochain cours */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">✶ Prochain cours</div>
            </div>
            {!prochainCours ? (
              <div style={{ fontSize: '12px', color: 'var(--text3)', padding: '4px 0' }}>
                Aucun cours à venir.{' '}
                <Link to="/edt" style={{ color: 'var(--navy)', fontWeight: 600 }}>Configurer l'EDT →</Link>
              </div>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, var(--navy) 0%, #1a3a6e 100%)',
                borderRadius: '12px', padding: '16px', color: '#fff',
              }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  {prochainCours.label} · {prochainCours.start} – {prochainCours.end}
                </div>
                <div style={{ fontFamily: '"Syne", sans-serif', fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>
                  {prochainCours.matiere}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginBottom: '12px' }}>
                  {prochainCours.classe}{prochainCours.salle ? ` · Salle ${prochainCours.salle}` : ''}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {['Contenu', 'Devoirs', 'Ressources'].map(tag => (
                    <span key={tag} style={{
                      fontSize: '10px', padding: '2px 8px',
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: '20px', color: 'rgba(255,255,255,0.8)',
                    }}>{tag}</span>
                  ))}
                </div>
                {user?.role === 'enseignant' && (
                  <Link to="/saisie" className="btn btn-gold btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}>
                    ✦ Préparer la séance
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          {unreadNotifs > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--navy)' }}>
                    🔔 {cntNotifs} notification{unreadNotifs > 1 ? 's' : ''} non lue{unreadNotifs > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                    Messages en attente de lecture
                  </div>
                </div>
                <Link to="/notifications" className="btn btn-ghost btn-sm">Voir</Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
