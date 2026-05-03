import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../hooks/useResources';
import { useOutletContext } from 'react-router-dom';

const TYPE_LABELS = { pdf: 'PDF', video: 'Vidéo', image: 'Image', lien: 'Lien', autre: 'Autre' };
const TYPE_COLORS = {
  pdf:   { bg: '#fff4f0', color: '#e05a2b', border: '#ffd5c2' },
  video: { bg: '#f0f4ff', color: '#3b5bdb', border: '#c5d0f7' },
  image: { bg: '#f0faf5', color: '#2f9e5a', border: '#b8ebd0' },
  lien:  { bg: '#fffbf0', color: '#c08800', border: '#ffe08a' },
  autre: { bg: '#f4f4f8', color: '#666',    border: '#ddd'    },
};

function groupByMonth(list) {
  const groups = {};
  list.forEach(r => {
    const d     = new Date(r.created_at);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = { key, label, items: [] };
    groups[key].items.push(r);
  });
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
}

function groupBySession(list) {
  const avecSession = {};
  const sansSession = [];

  list.forEach(r => {
    if (r.session_id && r.session) {
      if (!avecSession[r.session_id]) {
        avecSession[r.session_id] = { session: r.session, sessionId: r.session_id, items: [] };
      }
      avecSession[r.session_id].items.push(r);
    } else {
      sansSession.push(r);
    }
  });

  const grouped = Object.values(avecSession).sort((a, b) =>
    new Date(b.session.date_cours) - new Date(a.session.date_cours)
  );

  return { grouped, sansSession };
}

function DetailModal({ resource, onClose, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  if (!resource) return null;
  const style = TYPE_COLORS[resource.type] || TYPE_COLORS.autre;
  const dateComplete = new Date(resource.created_at).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleDelete = () => {
    if (!confirming) { setConfirming(true); return; }
    onDelete(resource);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '10px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '20px',
              background: style.bg, border: `1px solid ${style.border}`,
            }}>
              {resource.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--navy)' }}>{resource.nom}</div>
              <span style={{
                background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
              }}>
                {TYPE_LABELS[resource.type] || 'Autre'}
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InfoRow label="Date d'ajout" value={dateComplete} />
          {resource.taille && <InfoRow label="Taille" value={resource.taille} />}
          {resource.classe && resource.classe !== 'Toutes' && (
            <InfoRow label="Classe associée" value={resource.classe} />
          )}
          {resource.session && (
            <InfoRow
              label="Séance liée"
              value={
                <span style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  {resource.session.titre} — {resource.session.matiere}
                  {' · '}
                  {new Date(resource.session.date_cours).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              }
            />
          )}
          <InfoRow label="Accès" value={
            <a href={resource.url} target="_blank" rel="noreferrer"
              style={{ color: 'var(--navy)', wordBreak: 'break-all', fontSize: '12px' }}>
              {resource.url.length > 60 ? resource.url.slice(0, 60) + '…' : resource.url}
            </a>
          } />

          {confirming && (
            <div style={{
              padding: '12px 14px', borderRadius: '8px',
              background: '#fff4f0', border: '1px solid #ffd5c2',
              fontSize: '13px', color: 'var(--coral)',
            }}>
              ⚠ Cette action est irréversible. La ressource sera supprimée définitivement.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--coral)', marginRight: 'auto' }}
            onClick={handleDelete}
          >
            {confirming ? '⚠ Confirmer la suppression' : '✕ Supprimer'}
          </button>
          {confirming && (
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
              Annuler
            </button>
          )}
          <a href={resource.url} target="_blank" rel="noreferrer"
            className="btn btn-navy" style={{ textDecoration: 'none' }}>
            {resource.type === 'lien' || resource.type === 'video' ? '◉ Ouvrir le lien' : '◎ Voir le fichier'}
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', color: 'var(--text1)' }}>{value}</span>
    </div>
  );
}

function SessionHeader({ session, count }) {
  const date = new Date(session.date_cours).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const classeNom = session.classe?.nom || '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', borderRadius: '10px',
      background: 'linear-gradient(135deg, var(--navy) 0%, #1a3a6e 100%)',
      marginBottom: '10px',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '8px',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', flexShrink: 0,
      }}>
        ◎
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
          {session.titre || 'Séance sans titre'}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
          {[session.matiere, classeNom, date].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.2)', color: '#fff',
        borderRadius: '20px', padding: '3px 10px',
        fontSize: '11px', fontWeight: 700, flexShrink: 0,
      }}>
        {count} ressource{count > 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default function RessourcesPage() {
  const { user } = useAuth();
  const { showToast } = useOutletContext() || {};
  const { resources, loading, uploading, uploadFile, addLink, deleteResource, stats } = useResources(user?.id);

  const [search, setSearch]             = useState('');
  const [filterType, setFilterType]     = useState('tous');
  const [filterClasse, setFilterClasse] = useState('toutes');
  const [sortBy, setSortBy]             = useState('date_desc');
  const [vue, setVue]                   = useState('seances');
  const [linkForm, setLinkForm]         = useState({ nom: '', url: '', classe: '' });
  const [selectedClasse, setSelectedClasse] = useState('');
  const [detail, setDetail]             = useState(null);
  const fileInputRef = useRef(null);

  const classesDisponibles = useMemo(() => {
    const set = new Set(resources.map(r => r.classe).filter(c => c && c !== 'Toutes'));
    return Array.from(set).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    let list = resources.filter(r => {
      const matchSearch = r.nom.toLowerCase().includes(search.toLowerCase());
      const matchType   = filterType === 'tous' || r.type === filterType;
      const matchClasse = filterClasse === 'toutes' || r.classe === filterClasse;
      return matchSearch && matchType && matchClasse;
    });

    switch (sortBy) {
      case 'date_asc':  list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'date_desc': list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'nom_asc':   list = [...list].sort((a, b) => a.nom.localeCompare(b.nom));                      break;
      case 'type':      list = [...list].sort((a, b) => a.type.localeCompare(b.type));                    break;
      default: break;
    }
    return list;
  }, [resources, search, filterType, filterClasse, sortBy]);

  const groupesMois    = useMemo(() => groupByMonth(filtered), [filtered]);
  const groupesSeances = useMemo(() => groupBySession(filtered), [filtered]);

  const handleFiles = async (files) => {
    for (const file of Array.from(files)) {
      try {
        await uploadFile(file, selectedClasse);
        showToast?.(`✦ "${file.name}" ajouté.`, 'success');
      } catch (e) {
        showToast?.(`Erreur : ${e.message}`, 'error');
      }
    }
  };

  const handleAddLink = async () => {
    if (!linkForm.nom.trim() || !linkForm.url.trim()) {
      showToast?.('Remplissez le titre et l\'URL.', 'error');
      return;
    }
    try {
      await addLink(linkForm);
      setLinkForm({ nom: '', url: '', classe: '' });
      showToast?.('✦ Lien ajouté.', 'success');
    } catch (e) {
      showToast?.(`Erreur : ${e.message}`, 'error');
    }
  };

  const handleDelete = async (r) => {
    try {
      await deleteResource(r);
      showToast?.('Ressource supprimée.', 'success');
      if (detail?.id === r.id) setDetail(null);
    } catch (e) {
      showToast?.(`Erreur : ${e.message}`, 'error');
    }
  };

  const vues = [
    { id: 'seances',    label: '◈ Par séance'  },
    { id: 'historique', label: '◉ Historique'  },
    { id: 'liste',      label: '☰ Liste'        },
  ];

  return (
    <div className="page active fade-in">
      <DetailModal resource={detail} onClose={() => setDetail(null)} onDelete={handleDelete} />

      <div className="section-title">
        <h3>◎ Bibliothèque des Ressources</h3>
        <p>Supports pédagogiques — {stats.total} ressource(s)</p>
      </div>

      {/* Barre de contrôles */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '180px' }}>
            <span className="search-icon">⊹</span>
            <input
              placeholder="Rechercher une ressource…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="field-select" style={{ width: '150px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="tous">Tous les types</option>
            <option value="pdf">PDF</option>
            <option value="video">Vidéo</option>
            <option value="image">Image</option>
            <option value="lien">Lien</option>
            <option value="autre">Autre</option>
          </select>

          <select className="field-select" style={{ width: '160px' }} value={filterClasse} onChange={e => setFilterClasse(e.target.value)}>
            <option value="toutes">Toutes les classes</option>
            {classesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select className="field-select" style={{ width: '160px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date_desc">Plus récent d'abord</option>
            <option value="date_asc">Plus ancien d'abord</option>
            <option value="nom_asc">Nom A → Z</option>
            <option value="type">Par type</option>
          </select>

          {/* Toggle vue */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--cream)', borderRadius: '8px', padding: '4px' }}>
            {vues.map(v => (
              <button
                key={v.id}
                onClick={() => setVue(v.id)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
                  background: vue === v.id ? 'var(--navy)' : 'transparent',
                  color: vue === v.id ? '#fff' : 'var(--text2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button className="btn btn-navy" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? '⊹ Envoi...' : '✦ Ajouter'}
          </button>
          <input
            ref={fileInputRef} type="file" multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mov"
            style={{ display: 'none' }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      </div>

      <div className="grid-2">
        {/* Colonne principale */}
        <div>
          {loading && (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Chargement des ressources…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⬦</div>
              <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
                {resources.length === 0
                  ? 'Aucune ressource. Déposez un fichier ou ajoutez un lien.'
                  : 'Aucune ressource ne correspond aux filtres sélectionnés.'}
              </p>
            </div>
          )}

          {/* ── VUE PAR SÉANCE ── */}
          {!loading && vue === 'seances' && filtered.length > 0 && (() => {
            const { grouped, sansSession } = groupesSeances;
            return (
              <>
                {grouped.length === 0 && sansSession.length === 0 && null}

                {grouped.map(({ session, sessionId, items }) => (
                  <div key={sessionId} style={{ marginBottom: '24px' }}>
                    <SessionHeader session={session} count={items.length} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {items.map(r => (
                        <ResourceCard key={r.id} resource={r} onDetail={() => setDetail(r)} onDelete={() => handleDelete(r)} />
                      ))}
                    </div>
                  </div>
                ))}

                {sansSession.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        padding: '4px 14px', background: 'var(--cream2)',
                        border: '1px solid var(--border)', color: 'var(--text2)',
                        borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      }}>
                        ⬦ Bibliothèque générale
                      </div>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                        {sansSession.length} ressource{sansSession.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {sansSession.map(r => (
                        <ResourceCard key={r.id} resource={r} onDetail={() => setDetail(r)} onDelete={() => handleDelete(r)} />
                      ))}
                    </div>
                  </div>
                )}

                {grouped.length === 0 && sansSession.length === 0 && (
                  <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                    Aucune ressource trouvée.
                  </div>
                )}
              </>
            );
          })()}

          {/* ── VUE HISTORIQUE par mois ── */}
          {!loading && vue === 'historique' && groupesMois.map(groupe => (
            <div key={groupe.key} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  padding: '4px 12px', background: 'var(--navy)', color: '#fff',
                  borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  textTransform: 'capitalize',
                }}>
                  {groupe.label}
                </div>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                  {groupe.items.length} ressource{groupe.items.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {groupe.items.map(r => (
                  <ResourceCard key={r.id} resource={r} onDetail={() => setDetail(r)} onDelete={() => handleDelete(r)} />
                ))}
              </div>
            </div>
          ))}

          {/* ── VUE LISTE ── */}
          {!loading && vue === 'liste' && filtered.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: '16px' }}>
                ✦ Mes ressources ({filtered.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filtered.map(r => (
                  <ResourceCard key={r.id} resource={r} onDetail={() => setDetail(r)} onDelete={() => handleDelete(r)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Stats */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>◉ Statistiques</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { type: 'pdf',   icon: '📄', label: 'Documents PDF'  },
                { type: 'video', icon: '▶',  label: 'Vidéos'         },
                { type: 'image', icon: '⬦',  label: 'Images'         },
                { type: 'lien',  icon: '⊹',  label: 'Liens externes' },
              ].map(s => {
                const count = stats[s.type] || 0;
                const pct   = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const style = TYPE_COLORS[s.type];
                return (
                  <div key={s.type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.icon} {s.label}</span>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--navy)' }}>{count}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--cream)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 10,
                        background: style.color, transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                );
              })}

              {/* Ressources liées à des séances vs bibliothèque générale */}
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Origine
                </div>
                {[
                  { label: 'Liées à une séance', count: resources.filter(r => r.session_id).length, color: 'var(--navy)' },
                  { label: 'Bibliothèque libre',  count: resources.filter(r => !r.session_id).length, color: 'var(--text3)' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                    <span style={{ color: 'var(--text2)' }}>{s.label}</span>
                    <span style={{ fontWeight: 700, color: s.color }}>{s.count}</span>
                  </div>
                ))}
              </div>

              {classesDisponibles.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Par classe
                  </div>
                  {classesDisponibles.map(c => (
                    <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                      <span style={{ color: 'var(--text2)' }}>{c}</span>
                      <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
                        {resources.filter(r => r.classe === c).length}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload */}
          <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>⬦</div>
            <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px' }}>
              PDF, Word, images, vidéos<br />Max 50 Mo par fichier
            </p>
            <div className="form-field" style={{ marginBottom: '12px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px' }}>Classe associée (optionnel)</label>
              <input
                className="field-input"
                placeholder="Ex: Terminale C"
                value={selectedClasse}
                onChange={e => setSelectedClasse(e.target.value)}
              />
            </div>
            <button
              className="btn btn-navy"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '⊹ Envoi en cours…' : '⬦ Importer un fichier'}
            </button>
            {uploading && (
              <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text3)' }}>
                Envoi en cours, veuillez patienter…
              </p>
            )}
          </div>

          {/* Ajout lien */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>✦ Ajouter un lien</div>
            <div className="form-field" style={{ marginBottom: '10px' }}>
              <label>Titre</label>
              <input
                className="field-input"
                placeholder="Ex: Khan Academy — Probabilités"
                value={linkForm.nom}
                onChange={e => setLinkForm({ ...linkForm, nom: e.target.value })}
              />
            </div>
            <div className="form-field" style={{ marginBottom: '10px' }}>
              <label>URL</label>
              <input
                className="field-input"
                placeholder="https://..."
                value={linkForm.url}
                onChange={e => setLinkForm({ ...linkForm, url: e.target.value })}
              />
            </div>
            <div className="form-field" style={{ marginBottom: '14px' }}>
              <label>Classe(s)</label>
              <input
                className="field-input"
                placeholder="Ex: Terminale C"
                value={linkForm.classe}
                onChange={e => setLinkForm({ ...linkForm, classe: e.target.value })}
              />
            </div>
            <button
              className="btn btn-navy"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleAddLink}
            >
              + Ajouter ce lien
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({ resource: r, onDetail, onDelete }) {
  const style = TYPE_COLORS[r.type] || TYPE_COLORS.autre;
  const date  = new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div
      className="ressource-item"
      style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onClick={onDetail}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      <div className={`ressource-icon ${r.typeCSS}`}>{r.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ressource-name" style={{ marginBottom: 3 }}>{r.nom}</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
          <span style={{
            fontSize: '10px', padding: '2px 7px', borderRadius: '20px',
            background: style.bg, color: style.color, border: `1px solid ${style.border}`,
            fontWeight: 600,
          }}>
            {TYPE_LABELS[r.type] || 'Autre'}
          </span>
          {r.session && (
            <span style={{
              fontSize: '10px', padding: '2px 7px', borderRadius: '20px',
              background: 'rgba(13,27,62,0.06)', color: 'var(--navy)',
              border: '1px solid rgba(13,27,62,0.12)', fontWeight: 600,
            }}>
              📚 {r.session.matiere}
            </span>
          )}
          {r.classe && r.classe !== 'Toutes' && (
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>· {r.classe}</span>
          )}
          {r.taille && <span style={{ fontSize: '11px', color: 'var(--text3)' }}>· {r.taille}</span>}
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>· {date}</span>
        </div>
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: '11px', color: 'var(--navy)', opacity: 0.6,
            textDecoration: 'none', display: 'block',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '320px',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
        >
          ⊹ {r.url.length > 60 ? r.url.slice(0, 60) + '…' : r.url}
        </a>
      </div>

      <div className="ressource-actions" onClick={e => e.stopPropagation()}>
        <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          {r.type === 'lien' || r.type === 'video' ? '◉ Ouvrir' : '◎ Voir'}
        </a>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--coral)' }}
          onClick={onDelete}
          title="Supprimer"
        >✕</button>
      </div>
    </div>
  );
}
