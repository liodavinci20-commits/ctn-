import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSessions } from '../context/SessionsContext';
import SessionDetailModal from '../components/modals/SessionDetailModal';

export default function HistoriquePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTeacherSessions } = useSessions();
  const sessions = getTeacherSessions(user?.id || 'enseignant');

  const [selectedSession, setSelectedSession] = useState(null);

  // Pour l'interface, on simule aussi des données non saisies (optionnel, pour l'affichage)
  const pendingSessions = [
    { id: 'p-1', date: 'Aujourd\'hui', classe: 'Terminale C', title: 'Probabilités', status: 'unsigned' }
  ];

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>✦ Historique des Séances</h3>
        <p>Archives complètes · {user?.name || 'Dr. Kamga Denis'}</p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <span className="search-icon">⊹</span>
            <input placeholder="Rechercher une séance…" />
          </div>
          <select className="field-select" style={{ width: '150px' }}>
            <option>Toutes les classes</option><option>Terminale C</option><option>Terminale D</option>
          </select>
          <select className="field-select" style={{ width: '140px' }}>
            <option>Tout le trimestre</option><option>Ce mois</option><option>Cette semaine</option>
          </select>
        </div>
      </div>

      <div className="card">
        {sessions.length === 0 && pendingSessions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>Aucune séance saisie pour le moment.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Classe</th><th>Matière</th><th>Titre de la séance</th><th>Statut</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Fake pending for demonstration */}
              {pendingSessions.map(ps => (
                 <tr key={ps.id}>
                  <td>{ps.date}</td>
                  <td>{ps.classe}</td>
                  <td>Mathématiques</td>
                  <td>{ps.title}</td>
                  <td><span className="badge badge-danger">⚑ À signer</span></td>
                  <td><button className="btn btn-gold btn-sm" onClick={() => navigate('/saisie')}>Compléter</button></td>
                 </tr>
              ))}

              {/* Dynamic filled sessions */}
              {sessions.map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.classe}</td>
                  <td>{s.matiere}</td>
                  <td>{s.title}</td>
                  <td>
                    <span className="badge badge-success">✓ Signé</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSession(s)}>◎ Voir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SessionDetailModal 
        isOpen={selectedSession !== null} 
        onClose={() => setSelectedSession(null)} 
        session={selectedSession} 
      />
    </div>
  );
}
