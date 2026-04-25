import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReferenceData } from '../hooks/useReferenceData';
import { useProgramme } from '../hooks/useProgramme';
import { supabase } from '../supabaseClient';
import { useOutletContext } from 'react-router-dom';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { classes, myClasses, matieres, myMatieres, loading, saveMyClasses, saveMyMatieres } = useReferenceData(user?.id);
  const { showToast } = useOutletContext() || {};

  const [selectedIds, setSelectedIds]         = useState([]);
  const [selectedMatiereIds, setSelectedMatiereIds] = useState([]);
  const [avatarUrl, setAvatarUrl]             = useState(user?.avatar_url || null);
  const [uploading, setUploading]             = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [savingMatieres, setSavingMatieres]   = useState(false);
  const [search, setSearch]                   = useState('');
  const [searchMatiere, setSearchMatiere]     = useState('');
  const [progressData, setProgressData]       = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const fileInputRef = useRef(null);
  const { getProgramme, getDoneChapitreIds }  = useProgramme();

  useEffect(() => {
    setSelectedIds(myClasses.map(c => c.id));
  }, [myClasses]);

  useEffect(() => {
    setSelectedMatiereIds(myMatieres.map(m => m.id));
  }, [myMatieres]);

  // Charge la progression pour chaque combinaison classe × matière
  useEffect(() => {
    if (!user || myClasses.length === 0 || myMatieres.length === 0) return;
    loadProgress();
  }, [myClasses, myMatieres]);

  const loadProgress = async () => {
    setLoadingProgress(true);
    const results = [];

    for (const classe of myClasses) {
      for (const matiere of myMatieres) {
        const prog = await getProgramme(classe.id, matiere.id);
        if (!prog) continue;

        const chapitres = (prog.programme_chapitres || []).sort((a, b) => a.ordre - b.ordre);
        if (chapitres.length === 0) continue;

        const doneIds = await getDoneChapitreIds(user.id, prog.id);
        const pct     = Math.round((doneIds.length / chapitres.length) * 100);

        results.push({
          key:       `${classe.id}_${matiere.id}`,
          classe:    classe.nom,
          matiere:   matiere.nom,
          chapitres,
          doneIds,
          pct,
          done:      doneIds.length,
          total:     chapitres.length,
        });
      }
    }

    setProgressData(results);
    setLoadingProgress(false);
  };

  const toggleClasse = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    // Tente d'abord un update (upsert manuel pour éviter les erreurs de droit)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error('Storage error:', uploadError.message);
      showToast?.(`Erreur upload : ${uploadError.message}`, 'error');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);
    const publicUrl = urlData?.publicUrl;

    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    setAvatarUrl(publicUrl || null);
    refreshProfile?.();
    showToast?.('Photo mise à jour.', 'success');
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveMyClasses(selectedIds);
    showToast?.('Classes enregistrées.', 'success');
    setSaving(false);
  };

  const handleSaveMatieres = async () => {
    setSavingMatieres(true);
    await saveMyMatieres(selectedMatiereIds);
    showToast?.('Matières enregistrées.', 'success');
    setSavingMatieres(false);
  };

  const roleLabel = {
    enseignant: 'Enseignant(e)',
    conseiller: 'Conseiller Pédagogique',
    admin:      'Administrateur',
  }[user?.role] || user?.role;

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>◑ Mon Profil</h3>
        <p>Photo de profil et classes que vous enseignez</p>
      </div>

      <div className="grid-6-4">

        {/* ── Colonne gauche : identité ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Photo */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">◉ Photo de profil</div>
                <div className="card-subtitle">Format JPG ou PNG · Max 5 Mo</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '8px' }}>
              {/* Aperçu avatar */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '90px', height: '90px', borderRadius: '50%',
                  background: avatarUrl ? 'transparent' : 'var(--navy)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                  border: '3px solid var(--border)', position: 'relative',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#fff', fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 700 }}>
                    {user?.av || '?'}
                  </span>
                )}
                {uploading && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                  }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>
                  Cliquez sur la photo pour la changer.
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Envoi...' : '⬦ Changer la photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
              </div>
            </div>
          </div>

          {/* Infos identité (lecture seule) */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>✦ Informations personnelles</div>
            <div className="form-row cols-2">
              <div className="form-field">
                <label>Prénom</label>
                <input className="field-input" value={user?.prenom || ''} readOnly style={{ background: 'var(--cream2)', color: 'var(--text3)' }} />
              </div>
              <div className="form-field">
                <label>Nom</label>
                <input className="field-input" value={user?.nom || ''} readOnly style={{ background: 'var(--cream2)', color: 'var(--text3)' }} />
              </div>
            </div>
            <div className="form-row cols-2">
              <div className="form-field">
                <label>Email</label>
                <input className="field-input" value={user?.email || ''} readOnly style={{ background: 'var(--cream2)', color: 'var(--text3)' }} />
              </div>
              <div className="form-field">
                <label>Matricule</label>
                <input className="field-input" value={user?.matricule || '—'} readOnly style={{ background: 'var(--cream2)', color: 'var(--text3)' }} />
              </div>
            </div>
            <div className="form-field">
              <label>Rôle</label>
              <input className="field-input" value={roleLabel} readOnly style={{ background: 'var(--cream2)', color: 'var(--text3)' }} />
            </div>
          </div>

          {/* ── Résumé classes & matières ── */}
          {(myClasses.length > 0 || myMatieres.length > 0) && (
            <div className="card" style={{ borderLeft: '4px solid var(--teal)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px' }}>
                <strong style={{ fontFamily: "'Syne', sans-serif", color: 'var(--navy)', fontSize: '14px' }}>
                  {user?.name},
                </strong>
                {' '}voici votre affectation actuelle :
              </div>

              {myClasses.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Vos classes
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {myClasses.map(c => (
                      <span key={c.id} style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: 'rgba(13,27,62,0.07)', color: 'var(--navy)',
                        border: '1px solid rgba(13,27,62,0.12)',
                      }}>
                        {c.nom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {myMatieres.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Vos matières
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {myMatieres.map(m => (
                      <span key={m.id} style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: 'rgba(26,140,122,0.08)', color: 'var(--teal)',
                        border: '1px solid rgba(26,140,122,0.2)',
                      }}>
                        {m.nom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {myClasses.length === 0 && myMatieres.length === 0 && (
                <div style={{ fontSize: '13px', color: 'var(--text3)', fontStyle: 'italic' }}>
                  Aucune affectation pour l'instant.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Colonne droite : classes ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">◈ Classes enseignées par l'enseignant</div>
                <div className="card-subtitle">
                  {loading ? 'Chargement…' : `${selectedIds.length} classe(s) sélectionnée(s)`}
                </div>
              </div>
            </div>

            {/* Barre de recherche */}
            <div style={{ position: 'relative', marginTop: '12px', marginBottom: '4px' }}>
              <span style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text3)', fontSize: '14px', pointerEvents: 'none',
              }}>◎</span>
              <input
                type="text"
                placeholder="Rechercher une classe…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="field-input"
                style={{ paddingLeft: '34px', marginBottom: '8px' }}
              />
            </div>

            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>Chargement des classes…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {classes.filter(c =>
                  c.nom.toLowerCase().includes(search.toLowerCase())
                ).map(c => {
                  const checked = selectedIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                        border: `1px solid ${checked ? 'var(--navy)' : 'var(--border2)'}`,
                        background: checked ? 'rgba(13,27,62,0.05)' : 'var(--white)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClasse(c.id)}
                        style={{ accentColor: 'var(--navy)', width: '16px', height: '16px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--navy)' }}>{c.nom}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                          {c.niveau} · Filière {c.filiere} · {c.effectif} élèves
                        </div>
                      </div>
                      {checked && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--teal)', background: 'rgba(26,140,122,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                          ✓ Assignée
                        </span>
                      )}
                    </label>
                  );
                })}

                {classes.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                    Aucune classe trouvée. Vérifiez que l'Étape 2 SQL a bien été exécutée.
                  </div>
                )}
                {classes.length > 0 && classes.filter(c => c.nom.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                    Aucune classe ne correspond à « {search} »
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-navy"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '20px' }}
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? 'Enregistrement...' : '✦ Enregistrer mes classes'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Section Progression ── */}
      {(progressData.length > 0 || loadingProgress) && (
        <div style={{ marginTop: '16px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">◉ Ma progression par programme</div>
                <div className="card-subtitle">
                  {loadingProgress ? 'Calcul en cours…' : `${progressData.length} programme(s) actif(s)`}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={loadProgress}
                disabled={loadingProgress}
              >
                ↺ Actualiser
              </button>
            </div>

            {loadingProgress ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                Chargement de la progression…
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '16px' }}>
                {progressData.map(p => (
                  <div key={p.key} style={{
                    border: '1px solid var(--border2)', borderRadius: '12px',
                    overflow: 'hidden', background: 'var(--white)',
                  }}>
                    {/* En-tête carte */}
                    <div style={{
                      padding: '14px 16px',
                      background: p.pct >= 80 ? 'rgba(26,140,122,0.07)' : p.pct >= 50 ? 'rgba(13,27,62,0.05)' : 'rgba(217,95,75,0.05)',
                      borderBottom: '1px solid var(--border2)',
                    }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'var(--navy)' }}>
                        {p.classe}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{p.matiere}</div>

                      {/* Barre de progression */}
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.done}/{p.total} chapitres</span>
                          <span style={{
                            fontSize: '12px', fontWeight: 700,
                            color: p.pct >= 80 ? 'var(--teal)' : p.pct >= 50 ? 'var(--navy)' : 'var(--coral)',
                          }}>
                            {p.pct}%
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--border2)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '99px',
                            width: `${p.pct}%`,
                            background: p.pct >= 80 ? 'var(--teal)' : p.pct >= 50 ? 'var(--blue)' : 'var(--coral)',
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Liste des chapitres */}
                    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {p.chapitres.map((c, i) => {
                        const done = p.doneIds.includes(c.id);
                        return (
                          <div key={c.id} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '12px',
                            color: done ? 'var(--teal)' : 'var(--text2)',
                          }}>
                            <span style={{
                              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '10px', fontWeight: 700,
                              background: done ? 'var(--teal)' : 'var(--cream)',
                              color: done ? '#fff' : 'var(--text3)',
                            }}>
                              {done ? '✓' : i + 1}
                            </span>
                            <span style={{ textDecoration: done ? 'none' : 'none', fontWeight: done ? 500 : 400 }}>
                              {c.titre}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section Matières ── */}
      <div style={{ marginTop: '16px' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">✶ Matières enseignées</div>
              <div className="card-subtitle">
                {loading ? 'Chargement…' : `${selectedMatiereIds.length} matière(s) sélectionnée(s)`}
              </div>
            </div>
          </div>

          {/* Recherche */}
          <div style={{ position: 'relative', marginTop: '12px', marginBottom: '4px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '14px', pointerEvents: 'none' }}>◎</span>
            <input
              type="text"
              placeholder="Rechercher une matière…"
              value={searchMatiere}
              onChange={e => setSearchMatiere(e.target.value)}
              className="field-input"
              style={{ paddingLeft: '34px', marginBottom: '8px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginTop: '8px' }}>
            {matieres
              .filter(m => m.nom.toLowerCase().includes(searchMatiere.toLowerCase()))
              .map(m => {
                const checked = selectedMatiereIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                      border: `1px solid ${checked ? 'var(--teal)' : 'var(--border2)'}`,
                      background: checked ? 'rgba(26,140,122,0.05)' : 'var(--white)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedMatiereIds(prev =>
                        prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                      )}
                      style={{ accentColor: 'var(--teal)', width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--navy)' }}>{m.nom}</div>
                      {m.code && <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{m.code}</div>}
                    </div>
                    {checked && <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: 'var(--teal)' }}>✓</span>}
                  </label>
                );
              })}
            {matieres.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px', gridColumn: '1/-1' }}>
                Aucune matière. Vérifiez que l'Étape 7 SQL a été exécutée.
              </div>
            )}
          </div>

          <button
            className="btn btn-teal"
            style={{ marginTop: '16px', justifyContent: 'center', padding: '12px 28px' }}
            onClick={handleSaveMatieres}
            disabled={savingMatieres || loading}
          >
            {savingMatieres ? 'Enregistrement...' : '✶ Enregistrer mes matières'}
          </button>
        </div>
      </div>
    </div>
  );
}
