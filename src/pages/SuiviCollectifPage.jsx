import React, { useState, useEffect, useMemo } from 'react';
import { useSuiviCollectif } from '../hooks/useSuiviCollectif';

const ANNEES = ['2024-2025', '2025-2026', '2026-2027'];

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function pctColor(pct) {
  if (pct === null || pct === undefined) return '#ccc';
  if (pct >= 75) return '#2f9e5a';
  if (pct >= 40) return '#f08c00';
  if (pct > 0)   return '#e05a2b';
  return '#bbb';
}

function pctLabel(pct) {
  if (pct === null) return 'Aucune fiche';
  if (pct >= 75)   return 'En avance';
  if (pct >= 40)   return 'En cours';
  if (pct > 0)     return 'Démarré';
  return 'Non démarré';
}

function pctBg(pct) {
  if (pct === null) return '#f4f4f8';
  if (pct >= 75)   return '#f0faf5';
  if (pct >= 40)   return '#fff9f0';
  if (pct > 0)     return '#fff4f0';
  return '#f8f8f8';
}

function MiniBar({ done, total, pct, showLabel = false }) {
  const color = pctColor(pct);
  const displayPct = pct ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        flex: 1, height: '7px', background: '#e9ecef',
        borderRadius: '4px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${displayPct}%`,
          background: color, borderRadius: '4px',
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '32px' }}>
        {pct !== null ? `${pct}%` : '—'}
      </span>
      {total > 0 && (
        <span style={{ fontSize: '10px', color: '#999', minWidth: '52px' }}>
          {done}/{total} sem.
        </span>
      )}
    </div>
  );
}

function TeacherCard({ teacher, rank }) {
  const [expanded, setExpanded] = useState(false);
  const { nom, prenom, avatar_initials, globalPct, globalDone, globalTotal, classes } = teacher;
  const color  = pctColor(globalPct);
  const bg     = pctBg(globalPct);
  const medal  = rank < 3 ? RANK_MEDALS[rank] : null;

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${color}`,
      background: globalPct >= 75 ? '#fafffe' : '#fff',
      position: 'relative',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Médaille ranking */}
      {medal && (
        <div style={{
          position: 'absolute', top: '10px', right: '12px',
          fontSize: '20px', lineHeight: 1,
        }}>
          {medal}
        </div>
      )}
      {!medal && (
        <div style={{
          position: 'absolute', top: '10px', right: '12px',
          fontSize: '11px', fontWeight: 700, color: '#bbb',
        }}>
          #{rank + 1}
        </div>
      )}

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--navy)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', fontWeight: 700, flexShrink: 0,
          border: `2px solid ${color}`,
        }}>
          {avatar_initials || `${(prenom?.[0] || '?')}${(nom?.[0] || '?')}`}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--navy)', lineHeight: 1.2 }}>
            {prenom} {nom}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginTop: '3px', padding: '2px 8px', borderRadius: '20px',
            background: bg, border: `1px solid ${color}30`,
            fontSize: '10px', fontWeight: 700, color,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: color, display: 'inline-block',
            }} />
            {pctLabel(globalPct)}
          </div>
        </div>
      </div>

      {/* Barre globale */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 600 }}>
            Avancement global
          </span>
          <span style={{ fontSize: '12px', fontWeight: 800, color }}>
            {globalPct !== null ? `${globalPct}%` : '—'}
          </span>
        </div>
        <div style={{ height: '10px', background: '#e9ecef', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${globalPct ?? 0}%`,
            background: color, borderRadius: '6px',
            transition: 'width 0.6s ease',
          }} />
        </div>
        {globalTotal > 0 && (
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px', textAlign: 'right' }}>
            {globalDone} semaine{globalDone !== 1 ? 's' : ''} effectuée{globalDone !== 1 ? 's' : ''} sur {globalTotal}
          </div>
        )}
      </div>

      {/* Détail par classe */}
      {classes.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '11px', color: 'var(--navy)', fontWeight: 600,
              padding: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {expanded ? '▾' : '▸'} Détail par classe ({classes.length})
          </button>

          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
              {classes.map(cls => (
                <div key={cls.id}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--navy)' }}>
                      {cls.nom}
                    </span>
                    {cls.updatedAt && (
                      <span style={{ fontSize: '9px', color: 'var(--text3)' }}>
                        màj {new Date(cls.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                  {cls.total > 0 ? (
                    <MiniBar done={cls.done} total={cls.total} pct={cls.pct} />
                  ) : (
                    <span style={{ fontSize: '10px', color: '#bbb', fontStyle: 'italic' }}>
                      Fiche non déposée
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {classes.length === 0 && (
        <div style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic', marginTop: '4px' }}>
          Aucune classe assignée
        </div>
      )}
    </div>
  );
}

export default function SuiviCollectifPage() {
  const [annee,  setAnnee]  = useState('2024-2025');
  const { data, loading, fetchSuivi } = useSuiviCollectif();

  useEffect(() => {
    fetchSuivi(annee);
  }, [annee]);

  // Stats globales
  const stats = useMemo(() => {
    const withData = data.filter(t => t.globalPct !== null);
    const avgPct   = withData.length
      ? Math.round(withData.reduce((s, t) => s + t.globalPct, 0) / withData.length)
      : null;
    const leading  = data.filter(t => t.globalPct !== null && t.globalPct >= 75).length;
    const started  = data.filter(t => t.globalPct !== null && t.globalPct > 0).length;
    return { total: data.length, avgPct, leading, started };
  }, [data]);

  return (
    <div className="page active fade-in">
      {/* En-tête avec stats */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--navy) 0%, #2c3e70 100%)',
        color: '#fff', marginBottom: '20px', padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '0.02em', marginBottom: '4px' }}>
              ▦ Suivi Collectif
            </div>
            <div style={{ fontSize: '13px', opacity: 0.75 }}>
              État d'avancement des fiches de progression · {annee}
            </div>
          </div>

          {/* Sélecteur d'année */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {ANNEES.map(a => (
              <button key={a} onClick={() => setAnnee(a)} style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                background: annee === a ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                outline: annee === a ? '2px solid rgba(255,255,255,0.5)' : 'none',
              }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Statistiques globales */}
        {!loading && data.length > 0 && (
          <div style={{
            display: 'flex', gap: '24px', marginTop: '20px',
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'Enseignants',    value: stats.total,   unit: '' },
              { label: 'Avancement moy.', value: stats.avgPct !== null ? `${stats.avgPct}%` : '—', unit: '' },
              { label: 'En avance (≥75%)', value: stats.leading, unit: '' },
              { label: 'Ont démarré',    value: stats.started, unit: '' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chargement */}
      {loading && (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{
            width: 28, height: 28, border: '3px solid var(--navy)',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          Chargement des données…
        </div>
      )}

      {/* Aucun enseignant */}
      {!loading && data.length === 0 && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>▦</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--navy)', marginBottom: '8px' }}>
            Aucun enseignant trouvé
          </div>
          <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
            Aucun enseignant actif n'est enregistré dans le système pour cette année scolaire.
          </p>
        </div>
      )}

      {/* Grille des cartes enseignants */}
      {!loading && data.length > 0 && (
        <>
          {/* Podium top 3 */}
          {data.slice(0, 3).some(t => t.globalPct !== null) && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '11px', color: 'var(--text3)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: '12px',
              }}>
                ▦ Classement par avancement
              </div>
            </div>
          )}

          <div className="grid-2">
            {data.map((teacher, idx) => (
              <TeacherCard key={teacher.id} teacher={teacher} rank={idx} />
            ))}
          </div>

          <div style={{
            marginTop: '16px', fontSize: '11px', color: 'var(--text3)',
            textAlign: 'center',
          }}>
            Mise à jour à chaque sauvegarde d'une fiche de progression ·
            Classement par avancement décroissant
          </div>
        </>
      )}
    </div>
  );
}
