import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="page active fade-in">
      {/* STATS GRID */}
      <div className="stats-grid">
        <div className="stat-card blue fade-in-1">
          <span className="stat-emo">✦</span>
          <div className="stat-value">68</div>
          <div className="stat-label">Séances documentées</div>
          <div className="stat-trend up">▲ +4 cette semaine</div>
        </div>
        <div className="stat-card gold fade-in-2">
          <span className="stat-emo">◉</span>
          <div className="stat-value">74<span style={{ fontSize: '16px', fontWeight: 400 }}>%</span></div>
          <div className="stat-label">Taux de progression moyen</div>
          <div className="stat-trend up">▲ Programme en bonne voie</div>
        </div>
        <div className="stat-card teal fade-in-3">
          <span className="stat-emo">✶</span>
          <div className="stat-value">5</div>
          <div className="stat-label">Classes en charge</div>
          <div className="stat-trend">◈ Term. C · Term. D · 1ère C…</div>
        </div>
        <div className="stat-card coral fade-in-4">
          <span className="stat-emo">⚑</span>
          <div className="stat-value">2</div>
          <div className="stat-label">Séances en retard</div>
          <div className="stat-trend down">▼ Action requise</div>
        </div>
      </div>

      <div className="grid-7-3" style={{ marginBottom: '20px' }}>
        {/* Recentes seances */}
        <div className="card fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">✦ Mes séances récentes</div>
              <div className="card-subtitle">Dernières entrées du cahier</div>
            </div>
            <Link to="/historique" className="btn btn-ghost btn-sm">Voir tout ›</Link>
          </div>

          <div className="seance-preview">
            <div className="sp-header">
              <div className="sp-date"><div className="sp-date-d">14</div><div className="sp-date-m">Oct</div></div>
              <div className="sp-meta" style={{ flex: 1 }}>
                <h4>Algorithmique — Complexité des algorithmes</h4>
                <p>Terminale C · 3h de cours · {user.name} · {user.role.split('·')[0]}</p>
              </div>
              <span className="badge badge-success">✓ Signé</span>
            </div>
            <div className="sp-body">
              <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Introduction à la notion de complexité temporelle et spatiale. Étude comparative des algorithmes de tri (bulles, fusion, rapide). Travaux pratiques sur Python.</p>
              <div className="sp-tags">
                <span className="badge badge-info">Algorithmique</span>
                <span className="badge badge-neutral">Python</span>
                <span className="badge badge-neutral">Complexité O(n)</span>
              </div>
            </div>
          </div>

          {/* More seances omitted for brevity... */}
          <div className="seance-preview">
             <div className="sp-header">
               <div className="sp-date" style={{ background: 'var(--coral)' }}><div className="sp-date-d">08</div><div className="sp-date-m">Oct</div></div>
               <div className="sp-meta" style={{ flex: 1 }}>
                 <h4>Probabilités — Variables aléatoires</h4>
                 <p>Terminale C · 2h de cours</p>
               </div>
               <span className="badge badge-danger">⚑ Non signé</span>
             </div>
             <div className="sp-body">
               <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Séance à compléter. Contenu non encore saisi dans le cahier.</p>
             </div>
           </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">◉ Progression par classe</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div className="progress-label"><span>Terminale C</span><span style={{ fontWeight: 600, color: 'var(--navy)' }}>82%</span></div>
                <div className="progress-bar"><div className="progress-fill blue" style={{ width: '82%' }}></div></div>
              </div>
              <div>
                <div className="progress-label"><span>1ère D</span><span style={{ fontWeight: 600, color: 'var(--navy)' }}>55%</span></div>
                <div className="progress-bar"><div className="progress-fill coral" style={{ width: '55%' }}></div></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">⚑ Alertes</div>
            </div>
            <div className="alert alert-danger" style={{ marginBottom: '8px' }}>
              <span className="alert-emo">⚑</span>
              <div>
                <div className="alert-title">Retard · 1ère D</div>
                <div className="alert-body">3 séances non saisies. Rattrapage proposé le 18 Oct.</div>
              </div>
            </div>
            <div className="alert alert-warning">
              <span className="alert-emo">◉</span>
              <div>
                <div className="alert-title">Progression faible · 2nde A</div>
                <div className="alert-body">40% du programme complété à ce stade.</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
               <div className="card-title">✶ Prochain cours</div>
            </div>
            <div style={{ background: 'var(--navy)', borderRadius: '12px', padding: '16px', color: 'var(--white)' }}>
               <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Aujourd'hui · 10h00 – 12h00</div>
               <div style={{ fontFamily: '"Syne", sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Mathématiques</div>
               <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>Terminale C · Salle 12</div>
               <Link to="/saisie" className="btn btn-gold btn-sm" style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>✦ Préparer la séance</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
