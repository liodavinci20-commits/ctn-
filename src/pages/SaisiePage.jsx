import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSessions } from '../context/SessionsContext';
import { useReferenceData } from '../hooks/useReferenceData';
import { useProgramme } from '../hooks/useProgramme';
import { useResources } from '../hooks/useResources';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import FicheTableauDynamique from '../components/FicheTableauDynamique';

function currentAnnee() {
  const now = new Date();
  const y = now.getFullYear();
  return (now.getMonth() + 1) >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export default function SaisiePage() {
  const { user } = useAuth();
  const { addSession, updateSession } = useSessions();
  const { myClasses: classes, myMatieres, getClasseIdByName, getMatiereIdByName } = useReferenceData(user?.id);
  const { getProgramme, getDoneChapitreIds, markChapitre } = useProgramme();
  const { uploadFile, addLink: addResourceLink } = useResources(user?.id);
  const { showToast } = useOutletContext() || {};
  const navigate = useNavigate();
  const location = useLocation();

  const editSession = location.state?.editSession;

  const canvasRef      = useRef(null);
  const drawingRef     = useRef(false);
  const resFileRef     = useRef(null);
  const [signed, setSigned] = useState(!!editSession?.signature);
  const [saving, setSaving]         = useState(false);
  const [validing, setValiding]     = useState(false);
  const [resFiles, setResFiles]     = useState([]);
  const [resLink, setResLink]       = useState('');
  const [resLinkNom, setResLinkNom] = useState('');

  // Form State
  const [classe, setClasse] = useState(editSession?.classe || classes[0]?.nom || '');
  const [matiere, setMatiere] = useState(editSession?.matiere || 'Mathématiques');
  const [title, setTitle] = useState(editSession?.title || 'Complexité des algorithmes');
  const [content, setContent] = useState(editSession?.content || 'Introduction à la notion de complexité temporelle et spatiale...');
  
  const [competences, setCompetences] = useState(editSession?.competences || ['Analyser un algorithme', 'Calculer une complexité']);
  const [compInput, setCompInput] = useState('');
  const [devoirs, setDevoirs] = useState(editSession?.devoirs || [{ desc: 'Exercices 3, 4, 5 p.92 sur la complexité', date: '2024-10-22' }]);
  const [selectedChips, setSelectedChips] = useState({ type: editSession?.typeSeance || 'Cours' });
  const [allChips, setAllChips] = useState({ eleves: ['Tout le groupe'] });

  // Prévisualisation + edition progression depuis la saisie
  const [showProgModal, setShowProgModal] = useState(false);
  const [progRows,      setProgRows]      = useState(null);
  const [progAnnee,     setProgAnnee]     = useState('2024-2025');
  const [progLoading,   setProgLoading]   = useState(false);
  const [progSaving,    setProgSaving]    = useState(false);

  // Programme & chapitres
  const [programme, setProgramme]             = useState(null);
  const [chapitres, setChapitres]             = useState([]);
  const [doneIds, setDoneIds]                 = useState([]);
  const [selectedChapitreId, setSelectedChapitreId] = useState(null);
  const [loadingProg, setLoadingProg]         = useState(false);

  const suggestions = ['Résoudre un problème algorithmique', 'Raisonner par récurrence', 'Communiquer en mathématiques', 'Modéliser une situation'];

  // Sélectionne la première classe dispo une fois chargées
  useEffect(() => {
    if (!editSession && classes.length > 0 && !classe) setClasse(classes[0].nom);
  }, [classes, editSession]);

  // Réinitialise le cache de progression si la classe change
  useEffect(() => { setProgRows(null); }, [classe]);

  const ouvrirProgression = async () => {
    const classeId = getClasseIdByName(classe);
    if (!classeId || !user?.id) return;
    setShowProgModal(true);
    if (progRows !== null) return; // deja charge pour cette classe
    setProgLoading(true);
    try {
      // Pas de filtre sur l'annee : on prend le record le plus recent pour cette classe
      const { data } = await supabase
        .from('fiches_progression_contenu')
        .select('lignes, annee')
        .eq('teacher_id', user.id)
        .eq('classe_id', classeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.lignes) {
        setProgRows(data.lignes.map(r => ({ fait: false, ...r })));
        setProgAnnee(data.annee || currentAnnee());
      } else {
        setProgRows([]);
      }
    } finally {
      setProgLoading(false);
    }
  };

  const sauvegarderProgression = async (rows) => {
    const classeId = getClasseIdByName(classe);
    if (!classeId || !user?.id) return;
    setProgSaving(true);
    try {
      const done  = rows.filter(r => r.fait).length;
      const total = rows.length;

      // Upsert lignes
      const { data: existing } = await supabase
        .from('fiches_progression_contenu')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('classe_id', classeId)
        .eq('annee', progAnnee)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('fiches_progression_contenu')
          .update({ lignes: rows })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('fiches_progression_contenu')
          .insert({ teacher_id: user.id, classe_id: classeId, classe_nom: classe, annee: progAnnee, lignes: rows });
      }

      // Upsert avancement pour le Suivi Collectif
      await supabase
        .from('progression_avancement')
        .upsert(
          { teacher_id: user.id, classe_id: classeId, classe_nom: classe, annee: progAnnee, done, total },
          { onConflict: 'teacher_id,classe_id,annee' }
        );

      setProgRows(rows);
      if (showToast) showToast('Progression sauvegardee.', 'success');
    } catch (err) {
      if (showToast) showToast('Erreur : ' + err.message, 'error');
    } finally {
      setProgSaving(false);
    }
  };

  // Sélectionne la première matière dispo
  useEffect(() => {
    if (!editSession && myMatieres.length > 0 && matiere === 'Mathématiques' && !myMatieres.find(m => m.nom === 'Mathématiques')) {
      setMatiere(myMatieres[0].nom);
    }
  }, [myMatieres, editSession]);

  // Charge le programme quand classe + matière changent
  useEffect(() => {
    const classeId  = getClasseIdByName(classe);
    const matiereId = getMatiereIdByName(matiere);
    if (!classeId || !matiereId) { setProgramme(null); setChapitres([]); setDoneIds([]); return; }

    setLoadingProg(true);
    getProgramme(classeId, matiereId).then(async prog => {
      setProgramme(prog);
      const sorted = (prog?.programme_chapitres || []).sort((a, b) => a.ordre - b.ordre);
      setChapitres(sorted);
      if (prog) {
        const done = await getDoneChapitreIds(user.id, prog.id);
        setDoneIds(done);
      }
      setLoadingProg(false);
    });
  }, [classe, matiere]);

  // Canvas Drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Fit canvas internally to match CSS display size
    canvas.width = canvas.offsetWidth || 500;
    canvas.height = canvas.offsetHeight || 120;
    
    ctx.strokeStyle = '#0D1B3E';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // If edit mode and we have a signature, pre-fill the canvas
    if (editSession?.signature) {
       const img = new Image();
       img.onload = () => {
         ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
       };
       img.src = editSession.signature;
    }

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };

    const start = (e) => { e.preventDefault(); drawingRef.current = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    const move = (e) => { e.preventDefault(); if (!drawingRef.current) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setSigned(true); };
    const end = () => { drawingRef.current = false; };

    canvas.addEventListener('mousedown', start, { passive: false });
    canvas.addEventListener('mousemove', move, { passive: false });
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, [editSession]);

  const clearSig = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  };

  const addComp = (text) => {
    if (text && !competences.includes(text)) setCompetences([...competences, text]);
    setCompInput('');
  };

  const handleCompKey = (e) => {
    if (e.key === 'Enter') { addComp(compInput); }
  };

  const removeComp = (idx) => {
    setCompetences(competences.filter((_, i) => i !== idx));
  };

  const addDevoir = () => {
    setDevoirs([...devoirs, { desc: '', date: '' }]);
  };

  const saveDraft = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      if (showToast) showToast('Brouillon enregistré.', 'success');
    }, 1500);
  };

  const toggleChip = (name) => {
    setSelectedChips(prev => ({
      ...prev,
      type: prev.type === name ? '' : name,
    }));
  };

  const submitSeance = () => {
    if (!signed) {
      if (showToast) showToast('Veuillez signer la séance.', 'error');
      return;
    }

    if (!navigator.geolocation) {
      if (showToast) showToast('GPS non supporté sur ce navigateur.', 'error');
      return;
    }

    setValiding(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const canvas = canvasRef.current;
        const sigBase64 = canvas.toDataURL('image/png');

        const classeId  = getClasseIdByName(classe);
        const matiereId = getMatiereIdByName(matiere);
        if (!classeId) {
          setValiding(false);
          if (showToast) showToast('Erreur : Classe introuvable. Vérifiez votre profil.', 'error');
          return;
        }

        const sessionData = {
          teacherId:    user?.id,
          dateCours:    editSession?.dateCours || new Date().toISOString().split('T')[0],
          title,
          matiere,
          classeId,
          matiereId:    matiereId || null,
          content,
          typeSeance:   selectedChips.type || 'Cours',
          competences,
          devoirs,
          status:       'done',
          geoLat:       latitude,
          geoLng:       longitude,
          geoTime:      new Date().toISOString(),
          signature:    sigBase64,
        };

        try {
          let savedSession;
          if (editSession) {
            await updateSession(editSession.id, sessionData);
            if (showToast) showToast('✦ Séance modifiée et mise à jour !', 'success');
          } else {
            savedSession = await addSession(sessionData);

            // Upload toutes les ressources attachées à cette séance
            if (resFiles.length > 0) {
              for (const r of resFiles) {
                try {
                  if (r.file) {
                    await uploadFile(r.file, classe, savedSession.id);
                  } else {
                    await addResourceLink(
                      { nom: r.nom, url: r.url, classe },
                      savedSession.id
                    );
                  }
                } catch (e) {
                  console.error('Erreur upload ressource:', e.message);
                }
              }
            }

            if (showToast) showToast('✦ Séance validée et insérée dans le cahier !', 'success');
          }

          // Marque le chapitre sélectionné comme couvert
          if (selectedChapitreId) {
            await markChapitre(user.id, selectedChapitreId, savedSession?.id || null);
            setDoneIds(prev => [...new Set([...prev, selectedChapitreId])]);
          }

          navigate('/historique');
        } catch (error) {
          if (showToast) showToast('Erreur lors de la sauvegarde.', 'error');
          console.error(error);
        } finally {
          setValiding(false);
        }
      },
      (err) => {
        setValiding(false);
        if (showToast) showToast('Échec GPS : Vous devez autoriser la localisation pour valider.', 'error');
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="page active fade-in">

      {/* ── MODAL PRÉVISUALISATION PROGRESSION ── */}
      {showProgModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowProgModal(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(10,20,50,0.65)',
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'center', padding: '24px 16px',
            overflowY: 'auto',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: '14px', width: '100%',
            maxWidth: '1020px', padding: '24px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
            marginTop: '16px',
          }}>
            {/* En-tête modal */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '18px', flexWrap: 'wrap', gap: '10px',
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--navy)' }}>
                  Fiche de progression — {classe}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                  Annee {progAnnee} · Cochez les semaines effectuees puis sauvegardez
                </div>
              </div>
              <button
                onClick={() => setShowProgModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ flexShrink: 0 }}
              >
                x Fermer
              </button>
            </div>

            {/* Contenu */}
            {progLoading && (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)' }}>
                <div style={{
                  width: 24, height: 24, border: '3px solid var(--navy)',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                }} />
                Chargement de la fiche…
              </div>
            )}

            {!progLoading && progRows?.length > 0 && (
              <FicheTableauDynamique
                initialData={progRows}
                classeNom={classe}
                annee={progAnnee}
                onSave={sauvegarderProgression}
                saving={progSaving}
              />
            )}

            {!progLoading && progRows?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>▣</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--navy)', marginBottom: '8px' }}>
                  Aucune fiche disponible pour {classe}
                </div>
                <p style={{ fontSize: '12px', maxWidth: '320px', margin: '0 auto' }}>
                  Importez et structurez votre fiche de progression depuis l'onglet <strong>Fiche de Progression</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section-title">
        <h3>{editSession ? '✦ Corriger la Séance' : '✦ Nouvelle Séance'}</h3>
        <p>{editSession ? "Modifiez les informations. L'empreinte GPS sera actualisée lors de l'enregistrement." : "Renseignez les informations de la séance. Les champs marqués d'un ✶ sont obligatoires."}</p>
      </div>

      <div className="grid-6-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">◉ En-tête de séance</div>
                <div className="card-subtitle">Informations automatiques + sélections</div>
              </div>
              <span className="badge badge-info">✦ Auto-rempli</span>
            </div>
            <div className="form-row cols-3">
              <div className="form-field">
                <label>Enseignant ✶</label>
                <input className="field-input" value={user?.name || ''} readOnly style={{ background: 'var(--cream2)', color: 'var(--text3)' }} />
              </div>
              <div className="form-field">
                <label>Grade ✶</label>
                <input className="field-input" value={user?.grade || 'PLEG'} readOnly style={{ background: 'var(--cream2)', color: 'var(--text3)' }} />
              </div>
              <div className="form-field">
                <label>Matière ✶</label>
                {myMatieres.length > 0 ? (
                  <select className="field-select" value={matiere} onChange={e => setMatiere(e.target.value)}>
                    {myMatieres.map(m => <option key={m.id} value={m.nom}>{m.nom}</option>)}
                  </select>
                ) : (
                  <input className="field-input" value={matiere} onChange={e => setMatiere(e.target.value)} placeholder="Ex: Mathématiques" />
                )}
              </div>
            </div>
            <div className="form-row cols-3">
              <div className="form-field">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Classe ✶</span>
                  <button
                    type="button"
                    onClick={ouvrirProgression}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '10px', color: 'var(--navy)', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: '3px',
                      padding: '2px 0',
                    }}
                    title="Voir la fiche de progression de cette classe"
                  >
                    ▣ Voir progression
                  </button>
                </label>
                <select className="field-select" value={classe} onChange={e => setClasse(e.target.value)}>
                  {classes.map(c => (
                    <option key={c.id} value={c.nom}>{c.nom}</option>
                  ))}
                  {classes.length === 0 && <option>{classe}</option>}
                </select>
              </div>
              <div className="form-field">
                <label>Date du cours ✶</label>
                <input className="field-input" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-field">
                <label>Créneau horaire ✶</label>
                <select className="field-select" defaultValue="10h00 – 12h00">
                  <option>07h30 – 09h30</option><option>10h00 – 12h00</option><option>14h00 – 16h00</option><option>16h00 – 18h00</option>
                </select>
              </div>
            </div>
            <div className="form-row cols-2">
              <div className="form-field">
                <label>Séquence du programme ✶</label>
                <select className="field-select" defaultValue="Séquence 2 — Algorithmique">
                  <option>Séquence 1 — Fonctions</option>
                  <option>Séquence 2 — Algorithmique</option>
                  <option>Séquence 3 — Probabilités</option>
                </select>
              </div>
              <div className="form-field">
                <label>N° de séance</label>
                <input className="field-input" type="number" defaultValue="4" min="1" />
              </div>
            </div>
          </div>

          {/* ── Chapitres du programme ── */}
          {(chapitres.length > 0 || loadingProg) && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">◈ Programme officiel</div>
                  <div className="card-subtitle">
                    {loadingProg ? 'Chargement…' : `${doneIds.length}/${chapitres.length} chapitres couverts`}
                  </div>
                </div>
                {/* Barre de progression */}
                {!loadingProg && chapitres.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="progress-bar" style={{ width: '100px' }}>
                      <div
                        className={`progress-fill ${doneIds.length / chapitres.length >= 0.8 ? 'teal' : doneIds.length / chapitres.length >= 0.5 ? 'blue' : 'coral'}`}
                        style={{ width: `${Math.round((doneIds.length / chapitres.length) * 100)}%` }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>
                      {Math.round((doneIds.length / chapitres.length) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '8px 0 12px' }}>
                Sélectionnez le chapitre enseigné aujourd'hui. Il sera marqué comme couvert à la validation.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {chapitres.map((c, i) => {
                  const isDone     = doneIds.includes(c.id);
                  const isSelected = selectedChapitreId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedChapitreId(isSelected ? null : c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--navy)' : isDone ? 'var(--teal)' : 'var(--border2)'}`,
                        background: isSelected ? 'rgba(13,27,62,0.06)' : isDone ? 'rgba(26,140,122,0.05)' : 'var(--white)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        background: isDone ? 'var(--teal)' : isSelected ? 'var(--navy)' : 'var(--cream)',
                        color: isDone || isSelected ? '#fff' : 'var(--text3)',
                      }}>
                        {isDone ? '✓' : i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: isDone ? 'var(--teal)' : 'var(--navy)' }}>
                          {c.titre}
                        </div>
                        {c.description && (
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{c.description}</div>
                        )}
                      </div>
                      {isSelected && (
                        <span style={{ fontSize: '11px', color: 'var(--navy)', fontWeight: 600 }}>← Aujourd'hui</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header"><div><div className="card-title">✶ Contenu de la leçon</div></div></div>
            <div className="form-row">
              <div className="form-field">
                <label>Unité d'apprentissage ✶</label>
                <input className="field-input" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Unité d'enseignement</label>
                <input className="field-input" defaultValue="Notions de complexité temporelle" />
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Compétences visées ✶</label>
              <div className="comp-list">
                {competences.map((c, i) => (
                  <span className="comp-tag" key={i}>
                    {c} <span className="comp-tag-remove" onClick={() => removeComp(i)}>×</span>
                  </span>
                ))}
                <input
                  className="comp-input"
                  placeholder="Ajouter une compétence..."
                  value={compInput}
                  onChange={(e) => setCompInput(e.target.value)}
                  onKeyDown={handleCompKey}
                />
              </div>
              <div className="comp-suggestions">
                {suggestions.filter(s => !competences.includes(s)).map((s, i) => (
                  <span className="comp-sugg" key={i} onClick={() => addComp(s)}>+ {s}</span>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Plan de séance</label>
                <input className="field-input" defaultValue="I · Introduction  II · Complexités  III · Comparaison" />
              </div>
            </div>

            <div className="form-field">
              <label>Contenu détaillé de la séance ✶</label>
              <div className="editor-toolbar">
                <button className="editor-btn"><b>G</b></button>
                <button className="editor-btn"><i>I</i></button>
                <button className="editor-btn"><u>S</u></button>
                <div className="editor-sep"></div>
                <button className="editor-btn">≡</button>
                <button className="editor-btn">1.</button>
                <div className="editor-sep"></div>
                <button className="editor-btn" title="Surligner" style={{ background: 'rgba(232,180,85,0.2)' }}>⬦</button>
                <button className="editor-btn" title="Rouge" style={{ color: 'var(--coral)' }}>A</button>
                <button className="editor-btn" title="Bleu" style={{ color: 'var(--blue)' }}>A</button>
              </div>
              <textarea
                className="field-textarea"
                style={{ minHeight: '120px', borderRadius: '0 0 8px 8px', borderTop: 'none', resize: 'vertical' }}
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">◈ Travail à faire</div>
                <div className="card-subtitle">Devoirs et exercices à réaliser à domicile</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={addDevoir}>+ Ajouter</button>
            </div>
            {devoirs.map((d, i) => (
              <div className="form-row cols-2" key={i} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border2)' }}>
                <div className="form-field">
                  <label>Description du travail</label>
                  <input className="field-input" defaultValue={d.desc} placeholder="Ex: Exercices 3, 4, 5 p.92" onChange={(e) => {
                    const newDevs = [...devoirs];
                    newDevs[i].desc = e.target.value;
                    setDevoirs(newDevs);
                  }} />
                </div>
                <div className="form-field">
                  <label>Date limite de remise</label>
                  <input className="field-input" type="date" defaultValue={d.date} onChange={(e) => {
                    const newDevs = [...devoirs];
                    newDevs[i].date = e.target.value;
                    setDevoirs(newDevs);
                  }} />
                </div>
              </div>
            ))}
            <div className="form-field" style={{ marginTop: '8px' }}>
              <label>Travaux individualisés (élèves spécifiques)</label>
              <div className="chip-select">
                {['Tout le groupe', 'MBALLA Jean', 'FOTSO Clara', 'NKOMO Pierre', 'ONDOA Sophie'].map(name => (
                  <span
                    key={name}
                    className={`chip ${allChips.eleves.includes(name) ? 'selected' : ''}`}
                    onClick={() => {
                      const arr = allChips.eleves.includes(name)
                        ? allChips.eleves.filter(n => n !== name)
                        : [...allChips.eleves, name];
                      setAllChips({ eleves: arr });
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>⊹ Infos complémentaires</div>
            <div className="form-field" style={{ marginBottom: '14px' }}>
              <label>Type de séance</label>
              <div className="chip-select" style={{ marginTop: '4px' }}>
                {['Cours', 'TP', 'TD', 'Évaluation', 'Rattrapage'].map(t => (
                  <span key={t} className={`chip ${selectedChips.type === t ? 'selected' : ''}`} onClick={() => toggleChip(t)}>{t}</span>
                ))}
              </div>
            </div>
            <div className="form-field" style={{ marginBottom: '14px' }}>
              <label>Effectif présent / total</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="field-input" type="number" defaultValue="28" style={{ flex: 1 }} placeholder="Présents" />
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text3)' }}>/</span>
                <input className="field-input" type="number" defaultValue="32" style={{ flex: 1 }} placeholder="Total" />
              </div>
            </div>
            <div className="form-field" style={{ marginBottom: '14px' }}>
              <label>Progression de la leçon</label>
              <select className="field-select" defaultValue="Leçon en cours (34–66%)">
                <option>Leçon démarrée (0–33%)</option>
                <option>Leçon en cours (34–66%)</option>
                <option>Leçon terminée (67–100%)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Observations / Remarques</label>
              <textarea className="field-textarea" placeholder="Comportement, difficultés…" defaultValue="Classe attentive. Difficultés sur O()." style={{ minHeight: '80px' }}></textarea>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">◎ Ressources pédagogiques</div>
                <div className="card-subtitle">Fichiers et liens associés à cette séance</div>
              </div>
            </div>

            {/* Bouton d'import */}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '8px', border: '1px dashed var(--border)', borderRadius: '10px', gap: '8px' }}
              onClick={() => resFileRef.current?.click()}
            >
              <span style={{ fontSize: '16px' }}>⬦</span>
              Importer vos ressources pédagogiques ici
            </button>
            <input
              ref={resFileRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mov"
              style={{ display: 'none' }}
              onChange={e => {
                const newFiles = Array.from(e.target.files).map(f => ({
                  nom:  f.name,
                  url:  null,
                  size: f.size > 1024 * 1024
                    ? `${(f.size / (1024 * 1024)).toFixed(1)} Mo`
                    : `${(f.size / 1024).toFixed(0)} Ko`,
                  file: f,
                }));
                setResFiles(prev => [...prev, ...newFiles]);
                e.target.value = '';
              }}
            />

            {/* Liste des fichiers / liens sélectionnés */}
            {resFiles.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {resFiles.map((r, i) => (
                  <div className="ressource-item" key={i}>
                    <div className={`ressource-icon ${r.file ? 'res-pdf' : 'res-lnk'}`}>
                      {r.file ? '📄' : '⊹'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="ressource-name">{r.nom}</div>
                      <div className="ressource-meta">{r.file ? r.size : 'Lien externe'}</div>
                    </div>
                    <span
                      style={{ color: 'var(--coral)', cursor: 'pointer', fontSize: '18px' }}
                      onClick={() => setResFiles(prev => prev.filter((_, idx) => idx !== i))}
                    >×</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter un lien */}
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="form-field">
                <label>Titre du lien</label>
                <input
                  className="field-input"
                  placeholder="Ex: Cours en ligne — Khan Academy"
                  value={resLinkNom}
                  onChange={e => setResLinkNom(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="field-input"
                    style={{ flex: 1 }}
                    placeholder="https://..."
                    value={resLink}
                    onChange={e => setResLink(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-navy btn-sm"
                    onClick={() => {
                      if (!resLink.trim()) return;
                      setResFiles(prev => [...prev, {
                        nom:  resLinkNom.trim() || resLink,
                        url:  resLink,
                        size: 'Lien',
                        file: null,
                      }]);
                      setResLink('');
                      setResLinkNom('');
                    }}
                  >+ Ajouter</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--gold)' }}>
            <div className="card-title" style={{ marginBottom: '16px' }}>✦ Validation & Localisation</div>
            <div style={{ fontSize: '12px', color: 'var(--coral)', marginBottom: '12px' }}>
              ⚠ Votre signature et votre localisation géographique seront enregistrées lors de la validation.
            </div>
            <canvas ref={canvasRef} style={{ border: '1px solid var(--border)', borderRadius: '8px', cursor: 'crosshair', width: '100%', height: '120px', background: 'var(--white)' }}></canvas>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={clearSig}>✕ Effacer</button>
              <span style={{ fontSize: '11px', color: 'var(--text2)' }}>{signed ? '✓ Signé' : 'Signez ci-dessus'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-teal" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={saveDraft}>
              {saving ? '...Enregistrement' : '⊹ Sauvegarder Brouillon'}
            </button>
            <button className="btn btn-navy" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={submitSeance} disabled={validing}>
              {validing ? 'Acquisition GPS et validation...' : '✦ Signer et Valider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
