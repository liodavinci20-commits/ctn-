import React, { useState } from 'react';

export default function CourseModal({ isOpen, onClose, course, defaultSlot, onSave, onDelete, classes = [] }) {
  const [formData, setFormData] = useState({
    day:     defaultSlot?.day   || course?.day   || 'Lundi',
    start:   defaultSlot?.start || course?.start || '08h00',
    end:     defaultSlot?.end   || course?.end   || '10h00',
    matiere: course?.matiere || '',
    classe:  course?.classe  || '',
    salle:   course?.salle   || '',
    color:   course?.color   || 'blue',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{course ? '⚑ Modifier le cours' : '✦ Ajouter un cours'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="form-row cols-2">
              <div className="form-field">
                <label>Jour</label>
                <select className="field-select" value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})}>
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', gap: '8px', marginBottom: 0 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>Début</label>
                  <select className="field-select" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})}>
                    {['08h00','09h00','10h00','11h00','12h00','13h00','14h00','15h00','16h00','17h00'].map(h => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>Fin</label>
                  <select className="field-select" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})}>
                    {['09h00','10h00','11h00','12h00','13h00','14h00','15h00','16h00','17h00','18h00'].map(h => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-row cols-2">
              <div className="form-field">
                <label>Matière</label>
                <input required className="field-input" placeholder="Ex: Mathématiques" value={formData.matiere} onChange={e => setFormData({...formData, matiere: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Classe</label>
                {classes.length > 0 ? (
                  <select
                    required
                    className="field-select"
                    value={formData.classe}
                    onChange={e => setFormData({ ...formData, classe: e.target.value })}
                  >
                    <option value="">— Choisir une classe —</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.nom}>{c.nom}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    className="field-input"
                    placeholder="Ex: Terminale C"
                    value={formData.classe}
                    onChange={e => setFormData({ ...formData, classe: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div className="form-row cols-2">
              <div className="form-field">
                <label>Salle</label>
                <input required className="field-input" placeholder="Ex: Salle 12" value={formData.salle} onChange={e => setFormData({...formData, salle: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Couleur</label>
                <select className="field-select" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}>
                  <option value="blue">Bleu</option>
                  <option value="teal">Vert</option>
                  <option value="gold">Jaune</option>
                  <option value="coral">Rouge</option>
                </select>
              </div>
            </div>

          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: course ? 'space-between' : 'flex-end' }}>
            {course && (
              <button type="button" className="btn" style={{ color: 'var(--coral)', background: 'rgba(217,95,75,0.1)', border: 'none' }} onClick={() => onDelete(course.id)}>
                Supprimer
              </button>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-navy">Enregistrer</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
