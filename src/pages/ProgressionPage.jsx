import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReferenceData } from '../hooks/useReferenceData';
import { useProgression } from '../hooks/useProgression';
import { useExtractionFiche } from '../hooks/useExtractionFiche';
import { useOutletContext } from 'react-router-dom';
import FicheTableauDynamique from '../components/FicheTableauDynamique';

const ANNEES = ['2024-2025', '2025-2026', '2026-2027'];

const EXT_ICONS = {
  pdf:  { icon: '📄', color: '#e05a2b', bg: '#fff4f0', border: '#ffd5c2' },
  doc:  { icon: '📝', color: '#3b5bdb', bg: '#f0f4ff', border: '#c5d0f7' },
  docx: { icon: '📝', color: '#3b5bdb', bg: '#f0f4ff', border: '#c5d0f7' },
  xls:  { icon: '📊', color: '#2f9e5a', bg: '#f0faf5', border: '#b8ebd0' },
  xlsx: { icon: '📊', color: '#2f9e5a', bg: '#f0faf5', border: '#b8ebd0' },
};
function getExt(nom) { return nom?.split('.').pop()?.toLowerCase() || ''; }
function getFileStyle(nom) { return EXT_ICONS[getExt(nom)] || { icon: '📎', color: '#666', bg: '#f4f4f8', border: '#ddd' }; }

// ── Vue Tableau ──────────────────────────────────────────────────
function VueTableau({ classe, annee, onRetour, showToast }) {
  const { user }   = useAuth();
  const { extraireEtStructurer, sauvegarderContenu, chargerContenu,
          extracting, saving, progress } = useExtractionFiche(user?.id);

  const extractFileRef = useRef(null);
  const [rows, setRows]   = useState(null);   // null = pas encore extrait
  const [loaded, setLoaded] = useState(false);

  // Charge un contenu déjà sauvegardé
  useEffect(() => {
    chargerContenu(classe.id, annee).then(lignes => {
      if (lignes?.length) { setRows(lignes); setLoaded(true); }
    });
  }, [classe.id, annee]);

  const handleExtractFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const extracted = await extraireEtStructurer(file);
      setRows(extracted);
      showToast?.(`✦ ${extracted.length} lignes extraites avec succès.`, 'success');
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
    }
  };

  const handleSave = async (updatedRows) => {
    try {
      await sauvegarderContenu(updatedRows, {
        classeId:  classe.id,
        classeNom: classe.nom,
        annee,
      });
      setRows(updatedRows);
      showToast?.('✦ Fiche sauvegardée.', 'success');
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
    }
  };

  return (
    <div>
      {/* Barre de navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '20px', flexWrap: 'wrap',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={onRetour}>
          ← Retour aux fiches
        </button>
        <div style={{ height: '20px', width: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 600 }}>
          ▣ {classe.nom} · {annee}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-navy"
            onClick={() => extractFileRef.current?.click()}
            disabled={extracting}
            style={{ gap: '8px' }}
          >
            {extracting ? (
              <span>{progress || 'Extraction en cours…'}</span>
            ) : (
              <>◈ {rows ? 'Nouvelle extraction' : 'Extraire et structurer'}</>
            )}
          </button>
          <input
            ref={extractFileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleExtractFile}
          />
        </div>
      </div>

      {/* Indicateur de progression d'extraction */}
      {extracting && (
        <div className="card" style={{ marginBottom: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 20, height: 20, border: '3px solid var(--navy)',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', flexShrink: 0,
            }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--navy)' }}>
                Extraction en cours…
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                {progress}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* État initial — aucun contenu */}
      {!extracting && !rows && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>◈</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--navy)', marginBottom: '8px' }}>
            Extraire la fiche de progression
          </div>
          <p style={{ color: 'var(--text3)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 20px' }}>
            Importez votre fiche de progression au format <strong>PDF</strong> ou <strong>image</strong> (JPG, PNG).
            Le système analysera automatiquement le tableau et le convertira en format éditable.
          </p>
          <button
            className="btn btn-navy"
            onClick={() => extractFileRef.current?.click()}
            style={{ display: 'inline-flex', gap: '8px' }}
          >
            ◈ Choisir un fichier PDF ou image
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px' }}>
            PDF, JPG, PNG, WEBP · Résolution recommandée : 150 DPI minimum
          </p>
        </div>
      )}

      {/* Tableau dynamique */}
      {!extracting && rows && (
        <div className="card" style={{ padding: '20px' }}>
          <FicheTableauDynamique
            initialData={rows}
            classeNom={classe.nom}
            annee={annee}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────
export default function ProgressionPage() {
  const { user }          = useAuth();
  const { showToast }     = useOutletContext() || {};
  const { myClasses }     = useReferenceData(user?.id);
  const { fiches, loading, uploading, uploadFiche, deleteFiche } = useProgression(user?.id);

  const [annee, setAnnee]               = useState('2024-2025');
  const [confirming, setConfirming]     = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [activeTableau, setActiveTableau] = useState(null); // { classe, annee }
  const fileInputRef = useRef(null);

  const fichesAnnee = useMemo(() =>
    fiches.filter(f => f.annee === annee),
    [fiches, annee]
  );

  const classesAvecFiches = useMemo(() =>
    myClasses.map(c => ({
      ...c,
      fiche: fichesAnnee.find(f => f.classe_id === c.id) || null,
    })),
    [myClasses, fichesAnnee]
  );

  const nbDeposees   = classesAvecFiches.filter(c => c.fiche).length;
  const nbManquantes = classesAvecFiches.filter(c => !c.fiche).length;

  const triggerUpload = (classe) => {
    setUploadTarget(classe);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    e.target.value = '';
    try {
      await uploadFiche(file, { classeId: uploadTarget.id, classeNom: uploadTarget.nom, matiere: '', annee });
      showToast?.(`✦ Fiche déposée pour ${uploadTarget.nom}.`, 'success');
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
    } finally {
      setUploadTarget(null);
    }
  };

  const handleDelete = async (fiche) => {
    try {
      await deleteFiche(fiche);
      showToast?.('Fiche supprimée.', 'success');
      setConfirming(null);
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
    }
  };

  // ── Affichage du tableau dynamique ────────────────────────────
  if (activeTableau) {
    return (
      <div className="page active fade-in">
        <VueTableau
          classe={activeTableau}
          annee={annee}
          onRetour={() => setActiveTableau(null)}
          showToast={showToast}
        />
      </div>
    );
  }

  // ── Vue principale : liste des classes ────────────────────────
  return (
    <div className="page active fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="section-title">
        <h3>▣ Fiches de Progression</h3>
        <p>Planification annuelle par classe · {annee}</p>
      </div>

      {/* Barre de contrôle */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {ANNEES.map(a => (
              <button key={a} onClick={() => setAnnee(a)} style={{
                padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                background: annee === a ? 'var(--navy)' : 'var(--cream)',
                color: annee === a ? '#fff' : 'var(--text2)',
              }}>
                {a}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              { label: 'déposées',   value: nbDeposees,         color: 'var(--teal)'  },
              { label: 'manquantes', value: nbManquantes,       color: nbManquantes > 0 ? 'var(--coral)' : 'var(--text3)' },
              { label: 'classes',    value: myClasses.length,   color: 'var(--navy)'  },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {myClasses.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Complétion</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>
                {Math.round((nbDeposees / myClasses.length) * 100)}%
              </span>
            </div>
            <div style={{ height: '8px', background: 'var(--cream)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '10px',
                width: `${Math.round((nbDeposees / myClasses.length) * 100)}%`,
                background: nbDeposees === myClasses.length ? 'var(--teal)' : 'var(--navy)',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Aucune classe */}
      {!loading && myClasses.length === 0 && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>▣</div>
          <p style={{ color: 'var(--text2)', fontWeight: 600 }}>Aucune classe assignée</p>
        </div>
      )}

      {/* Grille des classes */}
      {!loading && myClasses.length > 0 && (
        <div className="grid-2">
          {classesAvecFiches.map(c => {
            const fiche     = c.fiche;
            const style     = fiche ? getFileStyle(fiche.nom_fichier) : null;
            const isConfirm = confirming === fiche?.id;

            return (
              <div key={c.id} className="card" style={{
                borderLeft: `4px solid ${fiche ? 'var(--teal)' : 'var(--border)'}`,
              }}>
                {/* En-tête */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--navy)' }}>{c.nom}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                      {c.niveau} · {c.effectif || '—'} élèves
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                    background: fiche ? 'rgba(26,140,122,0.1)' : 'var(--cream)',
                    color: fiche ? 'var(--teal)' : 'var(--text3)',
                    border: `1px solid ${fiche ? 'rgba(26,140,122,0.3)' : 'var(--border)'}`,
                  }}>
                    {fiche ? '✓ Fiche déposée' : '○ Aucune fiche'}
                  </span>
                </div>

                {/* Fichier déposé */}
                {fiche && (
                  <div style={{
                    padding: '10px 12px', borderRadius: '10px', marginBottom: '12px',
                    background: style.bg, border: `1px solid ${style.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '8px', background: '#fff',
                        border: `1px solid ${style.border}`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                      }}>
                        {style.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '12px', fontWeight: 600, color: 'var(--navy)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {fiche.nom_fichier}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                          {[fiche.taille, new Date(fiche.updated_at || fiche.created_at)
                            .toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          ].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>

                    {isConfirm && (
                      <div style={{
                        marginTop: '10px', padding: '10px', borderRadius: '8px',
                        background: '#fff4f0', border: '1px solid #ffd5c2',
                        fontSize: '12px', color: 'var(--coral)',
                      }}>
                        ⚠ Confirmer la suppression ? Action irréversible.
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--coral)', flex: 1, justifyContent: 'center' }}
                            onClick={() => handleDelete(fiche)}>
                            Supprimer
                          </button>
                          <button className="btn btn-ghost btn-sm"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => setConfirming(null)}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Bouton magique — Extraire et structurer */}
                  <button
                    className="btn btn-gold"
                    style={{ flex: 2, justifyContent: 'center', fontSize: '12px' }}
                    onClick={() => setActiveTableau(c)}
                  >
                    ◈ Tableau dynamique
                  </button>

                  {fiche ? (
                    <>
                      <a href={fiche.fichier_url} target="_blank" rel="noreferrer"
                        className="btn btn-navy btn-sm"
                        style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                        ◎ Voir
                      </a>
                      <button className="btn btn-ghost btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => triggerUpload(c)}
                        disabled={uploading}>
                        ⬦ Remplacer
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--coral)' }}
                        onClick={() => setConfirming(isConfirm ? null : fiche.id)}
                        title="Supprimer">
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => triggerUpload(c)}
                      disabled={uploading && uploadTarget?.id === c.id}
                    >
                      {uploading && uploadTarget?.id === c.id ? '⊹ Envoi…' : '⬦ Importer'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
          Chargement…
        </div>
      )}
    </div>
  );
}
