import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../hooks/useResources';
import { useOutletContext } from 'react-router-dom';

export default function RessourcesPage() {
  const { user } = useAuth();
  const { showToast } = useOutletContext() || {};
  const { resources, loading, uploading, uploadFile, addLink, deleteResource, stats } = useResources(user?.id);

  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [linkForm, setLinkForm]     = useState({ nom: '', url: '', classe: '' });
  const [selectedClasse, setSelectedClasse] = useState('');
  const fileInputRef = useRef(null);

  const filtered = resources.filter(r => {
    const matchSearch = r.nom.toLowerCase().includes(search.toLowerCase());
    const matchType   = filterType === 'tous' || r.type === filterType;
    return matchSearch && matchType;
  });

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
    } catch (e) {
      showToast?.(`Erreur : ${e.message}`, 'error');
    }
  };

  return (
    <div className="page active fade-in">
      <div className="section-title">
        <h3>◎ Bibliothèque des Ressources</h3>
        <p>Supports pédagogiques — {stats.total} ressource(s)</p>
      </div>

      {/* Barre de filtres */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <span className="search-icon">⊹</span>
            <input
              placeholder="Rechercher une ressource…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="field-select"
            style={{ width: '160px' }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="tous">Tous les types</option>
            <option value="pdf">PDF</option>
            <option value="video">Vidéo</option>
            <option value="image">Image</option>
            <option value="lien">Lien</option>
            <option value="autre">Autre</option>
          </select>
          <button className="btn btn-navy" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? '⊹ Envoi...' : '✦ Ajouter un fichier'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mov"
            style={{ display: 'none' }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      </div>

      <div className="grid-2">

        {/* Colonne gauche : drop zone + liste */}
        <div>
          {/* Bouton d'import */}
          <div className="card" style={{ marginBottom: '16px', textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⬦</div>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>
              PDF, Word, images, vidéos · Max 50 Mo par fichier
            </p>
            <button
              className="btn btn-navy"
              style={{ justifyContent: 'center', padding: '12px 28px', fontSize: '14px' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '⊹ Envoi en cours...' : '⬦ Importer un fichier'}
            </button>
            {uploading && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text3)' }}>
                Envoi en cours, veuillez patienter…
              </p>
            )}
          </div>

          {/* Classe associée au fichier */}
          <div className="card" style={{ marginBottom: '16px', padding: '12px 16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '6px' }}>
              Classe associée au prochain upload
            </label>
            <input
              className="field-input"
              placeholder="Ex: Terminale C (optionnel)"
              value={selectedClasse}
              onChange={e => setSelectedClasse(e.target.value)}
            />
          </div>

          {/* Liste des ressources */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>
              ✦ Mes ressources ({filtered.length})
            </div>

            {loading && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                Chargement…
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                {resources.length === 0
                  ? 'Aucune ressource. Déposez un fichier ou ajoutez un lien.'
                  : 'Aucune ressource ne correspond à la recherche.'}
              </div>
            )}

            {filtered.map((r) => (
              <div className="ressource-item" key={r.id}>
                <div className={`ressource-icon ${r.typeCSS}`}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="ressource-name">{r.nom}</div>
                  <div className="ressource-meta">
                    {[r.taille, r.classe, new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })]
                      .filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="ressource-actions">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    {r.type === 'lien' || r.type === 'video' ? '◉ Ouvrir' : '◎ Voir'}
                  </a>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--coral)' }}
                    onClick={() => handleDelete(r)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite : stats + ajout lien */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>◉ Statistiques</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '📄', label: 'Documents PDF',   count: stats.pdf   },
                { icon: '▶',  label: 'Vidéos',          count: stats.video },
                { icon: '⬦',  label: 'Images',          count: stats.image },
                { icon: '⊹',  label: 'Liens externes',  count: stats.lien  },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px', background: 'var(--cream)', borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{s.icon} {s.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

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
            <div className="form-field" style={{ marginBottom: '16px' }}>
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
