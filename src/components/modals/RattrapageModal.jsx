import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRattrapages } from '../../context/RattrapagesContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useReferenceData } from '../../hooks/useReferenceData';
import { supabase } from '../../supabaseClient';

const CRENEAUX = [
  '07h00 – 09h00',
  '09h00 – 11h00',
  '11h00 – 13h00',
  '14h00 – 16h00',
  '16h00 – 18h00',
  'Samedi 08h00 – 10h00',
];

export default function RattrapageModal({ isOpen, onClose, showToast }) {
  const { user }                          = useAuth();
  const { addRattrapage }                 = useRattrapages();
  const { sendNotification }              = useNotifications();
  const { myClasses, getClasseIdByName }  = useReferenceData(user?.id);

  const [classe, setClasse]   = useState('');
  const [date, setDate]       = useState('');
  const [creneau, setCreneau] = useState(CRENEAUX[3]);
  const [motif, setMotif]     = useState('');
  const [sending, setSending] = useState(false);
  const [adminIds, setAdminIds] = useState([]);

  // Pré-sélectionne la première classe du profil
  useEffect(() => {
    if (myClasses.length > 0 && !classe) {
      setClasse(myClasses[0].nom);
    }
  }, [myClasses]);

  // Charge les admins pour leur envoyer la notification
  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)
      .then(({ data }) => setAdminIds((data || []).map(a => a.id)));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!classe || !date || !motif.trim()) {
      showToast('Veuillez renseigner la classe, la date et le motif.', 'error');
      return;
    }

    setSending(true);
    try {
      const classeId = getClasseIdByName(classe) || null;

      await addRattrapage({
        teacherId:   user.id,
        teacherName: user.name,
        classe,
        classeId,
        date,
        creneau,
        motif: motif.trim(),
      });

      // Envoie une notification à chaque admin
      for (const adminId of adminIds) {
        await sendNotification({
          toUserId: adminId,
          type:     'warn',
          title:    `Demande de rattrapage · ${classe}`,
          body:     `${user.name} demande un rattrapage pour la classe ${classe} le ${date} (${creneau}). Motif : ${motif.trim()}`,
        });
      }

      showToast('Demande de rattrapage envoyée à l\'Administration.', 'success');
      setDate('');
      setMotif('');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'envoi de la demande.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚑ Proposer un Rattrapage</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            <span className="alert-emo">⚑</span>
            <div>
              <div className="alert-title">Demande envoyée à l'administration</div>
              <div className="alert-body">
                L'administrateur recevra une notification et pourra approuver ou rejeter la demande.
              </div>
            </div>
          </div>

          <div className="form-row cols-2">
            {/* Classe depuis le profil */}
            <div className="form-field">
              <label>Classe concernée</label>
              {myClasses.length > 0 ? (
                <select
                  className="field-select"
                  value={classe}
                  onChange={e => setClasse(e.target.value)}
                >
                  <option value="">— Choisir —</option>
                  {myClasses.map(c => (
                    <option key={c.id} value={c.nom}>{c.nom}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="field-input"
                  placeholder="Ex: Terminale C"
                  value={classe}
                  onChange={e => setClasse(e.target.value)}
                />
              )}
            </div>

            <div className="form-field">
              <label>Date proposée</label>
              <input
                className="field-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Créneau horaire</label>
            <select
              className="field-select"
              value={creneau}
              onChange={e => setCreneau(e.target.value)}
            >
              {CRENEAUX.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Motif du rattrapage</label>
            <textarea
              className="field-textarea"
              placeholder="Expliquez la raison de ce rattrapage…"
              value={motif}
              onChange={e => setMotif(e.target.value)}
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={sending}>
            Annuler
          </button>
          <button className="btn btn-navy" onClick={handleSend} disabled={sending}>
            {sending ? 'Envoi...' : '⚑ Envoyer la demande'}
          </button>
        </div>
      </div>
    </div>
  );
}
