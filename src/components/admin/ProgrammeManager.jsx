import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProgramme } from '../../hooks/useProgramme';
import { supabase } from '../../supabaseClient';

export default function ProgrammeManager() {
  const { user }   = useAuth();
  const programme  = useProgramme();

  const [classes, setClasses]   = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');

  const [currentProg, setCurrentProg] = useState(null);
  const [chapitres, setChapitres]     = useState([]);
  const [loading, setLoading]         = useState(false);

  const [newTitre, setNewTitre]   = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [adding, setAdding]       = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from('classes').select('id, nom').order('nom'),
      supabase.from('matieres').select('id, nom').order('nom'),
    ]).then(([c, m]) => {
      setClasses(c.data || []);
      setMatieres(m.data || []);
    });
  }, []);

  useEffect(() => {
    if (classeId && matiereId) loadProgramme();
    else { setCurrentProg(null); setChapitres([]); }
  }, [classeId, matiereId]);

  const loadProgramme = async () => {
    setLoading(true);
    const prog = await programme.getProgramme(classeId, matiereId);
    setCurrentProg(prog);
    setChapitres(prog?.programme_chapitres?.sort((a, b) => a.ordre - b.ordre) || []);
    setLoading(false);
  };

  const handleAddChapitre = async () => {
    if (!newTitre.trim()) return;
    setAdding(true);
    try {
      let prog = currentProg;
      if (!prog) {
        prog = await programme.getOrCreateProgramme(classeId, matiereId, user.id);
        setCurrentProg(prog);
      }
      const nextOrdre = chapitres.length > 0 ? Math.max(...chapitres.map(c => c.ordre)) + 1 : 1;
      const newChap = await programme.addChapitre(prog.id, newTitre.trim(), newDesc.trim(), nextOrdre);
      setChapitres(prev => [...prev, newChap]);
      setNewTitre('');
      setNewDesc('');
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    await programme.deleteChapitre(id);
    setChapitres(prev => prev.filter(c => c.id !== id));
    setDeletingId(null);
  };

  const nomClasse  = classes.find(c => c.id === classeId)?.nom  || '';
  const nomMatiere = matieres.find(m => m.id === matiereId)?.nom || '';

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <div>
          <div className="card-title">◈ Programmes officiels</div>
          <div className="card-subtitle">Définir les chapitres par classe et matière</div>
        </div>
      </div>

      {/* Sélecteurs */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        <select
          className="field-select"
          style={{ flex: 1, minWidth: '180px' }}
          value={classeId}
          onChange={e => setClasseId(e.target.value)}
        >
          <option value="">— Choisir une classe —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>

        <select
          className="field-select"
          style={{ flex: 1, minWidth: '180px' }}
          value={matiereId}
          onChange={e => setMatiereId(e.target.value)}
        >
          <option value="">— Choisir une matière —</option>
          {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      </div>

      {/* Zone chapitres */}
      {classeId && matiereId && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            padding: '10px 14px', background: 'var(--cream)', borderRadius: '8px',
            fontSize: '13px', color: 'var(--navy)', fontWeight: 600, marginBottom: '16px',
          }}>
            Programme : {nomClasse} · {nomMatiere}
            <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: '8px' }}>
              {chapitres.length} chapitre(s)
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Chargement…
            </div>
          ) : (
            <>
              {/* Liste des chapitres */}
              {chapitres.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px', marginBottom: '12px' }}>
                  Aucun chapitre pour ce programme. Ajoutez-en ci-dessous.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {chapitres.map((c, i) => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', border: '1px solid var(--border2)',
                    borderRadius: '10px', background: 'var(--white)',
                  }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'var(--navy)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--navy)' }}>{c.titre}</div>
                      {c.description && (
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{c.description}</div>
                      )}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--coral)', flexShrink: 0 }}
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                    >
                      {deletingId === c.id ? '…' : '✕'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Formulaire ajout */}
              <div style={{
                padding: '16px', border: '1px dashed var(--border2)',
                borderRadius: '10px', background: 'var(--cream)',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)', marginBottom: '10px' }}>
                  + Ajouter un chapitre
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    className="field-input"
                    style={{ flex: 2, minWidth: '200px' }}
                    placeholder="Ex: Chapitre 1 — Les fonctions"
                    value={newTitre}
                    onChange={e => setNewTitre(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddChapitre()}
                  />
                  <input
                    className="field-input"
                    style={{ flex: 2, minWidth: '180px' }}
                    placeholder="Description (optionnel)"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                  />
                  <button
                    className="btn btn-navy"
                    onClick={handleAddChapitre}
                    disabled={adding || !newTitre.trim()}
                  >
                    {adding ? '…' : '+ Ajouter'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!classeId || !matiereId ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
          Sélectionnez une classe et une matière pour gérer le programme.
        </div>
      ) : null}
    </div>
  );
}
