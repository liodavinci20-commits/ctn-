import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const NIVEAUX = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'];

export default function ClassesPage() {
  const { showToast } = useOutletContext() || {};

  const [classes, setClasses]                   = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [deletingId, setDeletingId]             = useState(null);
  const [confirmDeleteId, setConfirmDeleteId]   = useState(null);

  const [niveau, setNiveau]   = useState('6ème');
  const [section, setSection] = useState('');

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('classes').select('*').order('nom');
    if (error) showToast?.('Erreur chargement classes.', 'error');
    setClasses(data || []);
    setLoading(false);
  };

  const createClasse = async () => {
    const nom = section.trim() ? `${niveau} ${section.trim().toUpperCase()}` : niveau;
    if (classes.find(c => c.nom === nom)) {
      showToast?.(`La classe "${nom}" existe déjà.`, 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('classes').insert({
      nom,
      niveau,
      filiere: section.trim().toUpperCase() || null,
    });
    if (error) {
      showToast?.('Erreur création : ' + error.message, 'error');
    } else {
      showToast?.(`Classe "${nom}" créée avec succès.`, 'success');
      setSection('');
      await fetchClasses();
    }
    setSaving(false);
  };

  const deleteClasse = async (id, nom) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) {
      showToast?.('Erreur suppression : ' + error.message, 'error');
    } else {
      showToast?.(`Classe "${nom}" supprimée.`, 'success');
      await fetchClasses();
    }
    setDeletingId(null);
  };

  const byNiveau = NIVEAUX.reduce((acc, n) => {
    const list = classes.filter(c => c.niveau === n);
    if (list.length) acc[n] = list;
    return acc;
  }, {});
  const autresClasses = classes.filter(c => !NIVEAUX.includes(c.niveau));

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>▦ Gestion des Classes</h3>
        <p>Créez et organisez les classes de l'établissement. Elles apparaissent automatiquement dans le profil des enseignants.</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card blue">
          <span className="stat-emo">▦</span>
          <div className="stat-value">{loading ? '…' : classes.length}</div>
          <div className="stat-label">Classes enregistrées</div>
        </div>
        <div className="stat-card teal">
          <span className="stat-emo">✶</span>
          <div className="stat-value">{loading ? '…' : Object.keys(byNiveau).length}</div>
          <div className="stat-label">Niveaux présents</div>
        </div>
      </div>

      <div className="grid-6-4">

        {/* ── Liste des classes ── */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <div className="card-title">▦ Classes enregistrées</div>
              <div className="card-subtitle">{classes.length} classe(s) dans la base de données</div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{
                width: 24, height: 24, border: '3px solid var(--navy)',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
              }} />
              Chargement…
            </div>
          ) : classes.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>▦</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--navy)', marginBottom: '8px' }}>
                Aucune classe enregistrée
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '280px', margin: '0 auto' }}>
                Utilisez le formulaire pour créer votre première classe.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(byNiveau).map(([niv, list]) => (
                <div key={niv}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
                  }}>
                    {niv}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {list.map(c => (
                      <div key={c.id} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: confirmDeleteId === c.id ? '10px 10px 0 0' : '10px',
                          border: '1px solid var(--border2)',
                          borderBottom: confirmDeleteId === c.id ? 'none' : '1px solid var(--border2)',
                          background: 'var(--white)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              width: '32px', height: '32px', borderRadius: '8px',
                              background: 'var(--navy)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 700, flexShrink: 0,
                            }}>
                              {c.filiere || c.niveau?.slice(0, 1)}
                            </span>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>
                              {c.nom}
                            </div>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--coral)' }}
                            onClick={() => setConfirmDeleteId(confirmDeleteId === c.id ? null : c.id)}
                            disabled={deletingId === c.id}
                          >
                            {deletingId === c.id ? '…' : '✕ Supprimer'}
                          </button>
                        </div>
                        {confirmDeleteId === c.id && (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', borderRadius: '0 0 10px 10px',
                            border: '1px solid var(--coral)', borderTop: 'none',
                            background: 'rgba(217,95,75,0.06)',
                          }}>
                            <span style={{ fontSize: '12px', color: 'var(--coral)', fontWeight: 600 }}>
                              ⚠ Supprimer "{c.nom}" définitivement ?
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--text3)' }}
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Annuler
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#fff', background: 'var(--coral)', border: 'none' }}
                                onClick={() => deleteClasse(c.id, c.nom)}
                              >
                                Confirmer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {autresClasses.length > 0 && (
                <div>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
                  }}>
                    Autres
                  </div>
                  {autresClasses.map(c => (
                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '6px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: confirmDeleteId === c.id ? '10px 10px 0 0' : '10px',
                        border: '1px solid var(--border2)',
                        borderBottom: confirmDeleteId === c.id ? 'none' : '1px solid var(--border2)',
                        background: 'var(--white)',
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--navy)' }}>{c.nom}</div>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--coral)' }}
                          onClick={() => setConfirmDeleteId(confirmDeleteId === c.id ? null : c.id)}
                          disabled={deletingId === c.id}
                        >
                          {deletingId === c.id ? '…' : '✕ Supprimer'}
                        </button>
                      </div>
                      {confirmDeleteId === c.id && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: '0 0 10px 10px',
                          border: '1px solid var(--coral)', borderTop: 'none',
                          background: 'rgba(217,95,75,0.06)',
                        }}>
                          <span style={{ fontSize: '12px', color: 'var(--coral)', fontWeight: 600 }}>
                            ⚠ Supprimer "{c.nom}" définitivement ?
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--text3)' }}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Annuler
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#fff', background: 'var(--coral)', border: 'none' }}
                              onClick={() => deleteClasse(c.id, c.nom)}
                            >
                              Confirmer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Colonne droite ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div className="card" style={{ borderLeft: '4px solid var(--navy)' }}>
            <div className="card-title" style={{ marginBottom: '16px' }}>✦ Créer une classe</div>

            <div className="form-field" style={{ marginBottom: '14px' }}>
              <label>Niveau ✶</label>
              <select
                className="field-select"
                value={niveau}
                onChange={e => setNiveau(e.target.value)}
              >
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label>Section / Filière</label>
              <input
                className="field-input"
                placeholder="Ex : A, B, C, D…"
                value={section}
                onChange={e => setSection(e.target.value)}
              />
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                Laissez vide pour une classe sans section (ex : "6ème")
              </div>
            </div>

            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'var(--cream)', marginBottom: '16px',
              fontSize: '12px', color: 'var(--text2)',
            }}>
              Nom qui sera créé :{' '}
              <strong style={{ color: 'var(--navy)' }}>
                {section.trim() ? `${niveau} ${section.trim().toUpperCase()}` : niveau}
              </strong>
            </div>

            <button
              className="btn btn-navy"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              onClick={createClasse}
              disabled={saving}
            >
              {saving ? '…Création en cours' : '✦ Créer la classe'}
            </button>
          </div>

          <div className="alert alert-success">
            <span className="alert-emo">✓</span>
            <div>
              <div className="alert-title">Visible par les enseignants</div>
              <div className="alert-body">
                Toute classe créée ici apparaît immédiatement dans le profil des enseignants pour qu'ils puissent se l'assigner.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
