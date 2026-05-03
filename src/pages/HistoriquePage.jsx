import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSessions } from '../context/SessionsContext';
import SessionDetailModal from '../components/modals/SessionDetailModal';
import { supabase } from '../supabaseClient';

const PERIODS = [
  { label: 'Toute la periode', value: 'all' },
  { label: 'Cette semaine',    value: 'week' },
  { label: 'Ce mois',         value: 'month' },
  { label: 'Ce trimestre',    value: 'quarter' },
];

function isInPeriod(dateCours, period) {
  if (period === 'all' || !dateCours) return true;
  const d    = new Date(dateCours);
  const now  = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  if (period === 'week')    return diff <= 7;
  if (period === 'month')   return diff <= 30;
  if (period === 'quarter') return diff <= 90;
  return true;
}

export default function HistoriquePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessions, loading: loadingSess } = useSessions();

  const isAdmin     = user?.role === 'admin' || user?.role === 'conseiller';
  const isEnseignant = user?.role === 'enseignant';

  // Profils enseignants (pour admin/conseiller)
  const [teachers, setTeachers] = useState([]);
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('profiles')
      .select('id, nom, prenom, matricule')
      .eq('role', 'enseignant')
      .order('nom')
      .then(({ data }) => setTeachers(data || []));
  }, [isAdmin]);

  const teacherName = (id) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.prenom} ${t.nom}` : '—';
  };

  // Filtres
  const [search,          setSearch]          = useState('');
  const [filterClasse,    setFilterClasse]     = useState('');
  const [filterPeriod,    setFilterPeriod]     = useState('all');
  const [filterTeacherId, setFilterTeacherId]  = useState('');
  const [filterSigned,    setFilterSigned]     = useState('');

  const [selectedSession, setSelectedSession] = useState(null);

  // Séances selon le rôle
  const baseSessions = useMemo(() => {
    if (isEnseignant) return sessions.filter(s => s.teacherId === user?.id);
    return sessions; // admin/conseiller voient tout via RLS
  }, [sessions, user?.id, isEnseignant]);

  // Liste des classes disponibles dans les données
  const classeOptions = useMemo(() => {
    const set = new Set(baseSessions.map(s => s.classe).filter(Boolean));
    return [...set].sort();
  }, [baseSessions]);

  // Application des filtres
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return baseSessions.filter(s => {
      if (filterClasse     && s.classe !== filterClasse)           return false;
      if (filterTeacherId  && s.teacherId !== filterTeacherId)     return false;
      if (filterSigned === 'signed'   && !s.signature)            return false;
      if (filterSigned === 'unsigned' && s.signature)             return false;
      if (!isInPeriod(s.dateCours, filterPeriod))                 return false;
      if (q && !([s.title, s.classe, s.matiere, teacherName(s.teacherId)]
        .join(' ').toLowerCase().includes(q)))                     return false;
      return true;
    });
  }, [baseSessions, search, filterClasse, filterTeacherId, filterSigned, filterPeriod, teachers]);

  const signedCount   = filtered.filter(s => s.signature).length;
  const unsignedCount = filtered.length - signedCount;

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>Historique des Seances</h3>
        <p>
          {isAdmin
            ? `Archives completes · Tous les enseignants · ${filtered.length} seance${filtered.length !== 1 ? 's' : ''}`
            : `Archives · ${user?.name || ''} · ${filtered.length} seance${filtered.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Barre de filtres */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Recherche */}
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <span className="search-icon">⊹</span>
            <input
              placeholder="Rechercher par titre, classe, matiere..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filtre enseignant (admin seulement) */}
          {isAdmin && (
            <select
              className="field-select"
              style={{ width: '200px' }}
              value={filterTeacherId}
              onChange={e => setFilterTeacherId(e.target.value)}
            >
              <option value="">Tous les enseignants</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
              ))}
            </select>
          )}

          {/* Filtre classe */}
          <select
            className="field-select"
            style={{ width: '160px' }}
            value={filterClasse}
            onChange={e => setFilterClasse(e.target.value)}
          >
            <option value="">Toutes les classes</option>
            {classeOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Filtre période */}
          <select
            className="field-select"
            style={{ width: '160px' }}
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
          >
            {PERIODS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {/* Filtre signature */}
          <select
            className="field-select"
            style={{ width: '150px' }}
            value={filterSigned}
            onChange={e => setFilterSigned(e.target.value)}
          >
            <option value="">Toutes</option>
            <option value="signed">Signees</option>
            <option value="unsigned">Non signees</option>
          </select>

          {/* Reset */}
          {(search || filterClasse || filterTeacherId || filterPeriod !== 'all' || filterSigned) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch(''); setFilterClasse(''); setFilterTeacherId('');
                setFilterPeriod('all'); setFilterSigned('');
              }}
            >
              Reinitialiser
            </button>
          )}
        </div>

        {/* Compteurs rapides */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
              <strong style={{ color: 'var(--navy)' }}>{filtered.length}</strong> seance{filtered.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--teal)' }}>
              <strong>{signedCount}</strong> signee{signedCount !== 1 ? 's' : ''}
            </span>
            {unsignedCount > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--coral)' }}>
                <strong>{unsignedCount}</strong> non signee{unsignedCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="card">
        {loadingSess ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{
              width: 24, height: 24, border: '3px solid var(--navy)',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            Chargement des seances...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', opacity: 0.3, marginBottom: '12px' }}>◎</div>
            <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '6px' }}>
              Aucune seance trouvee
            </div>
            <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
              {search || filterClasse || filterTeacherId || filterSigned
                ? 'Aucun resultat pour ces filtres. Essayez de les reinitialiser.'
                : 'Aucune seance enregistree pour le moment.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {isAdmin && <th>Enseignant</th>}
                  <th>Classe</th>
                  <th>Matiere</th>
                  <th>Titre de la seance</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const isSigned = !!s.signature;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--text2)' }}>
                        {s.date}
                      </td>
                      {isAdmin && (
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--navy)' }}>
                            {teacherName(s.teacherId)}
                          </div>
                        </td>
                      )}
                      <td>
                        <span className="badge badge-neutral">{s.classe || '—'}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text2)' }}>
                        {s.matiere || '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--navy)', maxWidth: '260px' }}>
                          {s.title || '(Sans titre)'}
                        </div>
                        {s.subtitle && (
                          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                            {s.subtitle}
                          </div>
                        )}
                      </td>
                      <td>
                        {isSigned
                          ? <span className="badge badge-success">Signe</span>
                          : <span className="badge badge-danger">Non signe</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedSession(s)}
                          >
                            Voir
                          </button>
                          {isEnseignant && !isSigned && (
                            <button
                              className="btn btn-gold btn-sm"
                              onClick={() => navigate('/saisie', { state: { editSession: s } })}
                            >
                              Signer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
