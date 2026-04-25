import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SessionDetailModal({ isOpen, onClose, session }) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  if (!isOpen || !session) return null;

  const handleEdit = () => {
    onClose();
    navigate('/saisie', { state: { editSession: session } });
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const element = document.getElementById('pdf-content');
      
      const opt = {
        margin:       10,
        filename:     `Seance_CTN_${session.date.replace(/[\/\\ ]/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("Erreur lors de l'export PDF:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1000, padding: '20px' }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '24px 32px' }}>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--navy)' }}>◎ Cahier de Texte : Fiche détaillée</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text3)' }}>{session.teacherId === 'enseignant' ? 'Dr. Kamga Denis' : session.teacherId} · Saisie du {session.date}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div id="pdf-content" className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <span className="badge badge-info">{session.matiere}</span>
            <span className="badge badge-neutral">{session.classe}</span>
            <span className="badge badge-success">✓ Signé électroniquement</span>
          </div>

          <div className="card" style={{ marginBottom: '20px', padding: '24px', borderLeft: '4px solid var(--gold)' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--navy)', marginBottom: '4px' }}>{session.title}</h2>
            {session.subtitle && <h4 style={{ fontSize: '15px', color: 'var(--text2)', marginBottom: '16px', fontWeight: 500 }}>{session.subtitle}</h4>}
            
            {session.plan && (
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '0.05em' }}>Plan de la séance</strong>
                <p style={{ fontSize: '14px', color: 'var(--navy)', marginTop: '4px', fontWeight: 500 }}>{session.plan}</p>
              </div>
            )}

            <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Déroulement & Contenu</strong>
            <div style={{ fontSize: '14px', color: 'var(--text2)', background: 'var(--cream2)', padding: '16px', borderRadius: '8px', lineHeight: '1.6' }}>
              {session.content}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '12px' }}>◎ Compétences visées</h4>
              {session.competences && session.competences.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {session.competences.map((c, i) => (
                    <span key={i} className="badge badge-neutral" style={{ fontSize: '12px' }}>{c}</span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>Aucune compétence spécifique renseignée.</span>
              )}
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '12px' }}>◈ Travail à faire (Devoirs)</h4>
              {session.devoirs && session.devoirs.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {session.devoirs.map((d, i) => (
                    <li key={i}>
                      <strong>{d.date} :</strong> {d.desc}
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>Aucun devoir attribué.</span>
              )}
            </div>
          </div>

          {session.geoLat && session.geoLng && (
            <div className="card" style={{ marginBottom: '20px', padding: '24px', background: 'var(--cream)' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '8px' }}>📍 Preuve de Localisation & Horodatage</h4>
              <div style={{ fontSize: '13px', color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <div><strong>Latitude:</strong> {session.geoLat.toFixed(6)}</div>
                <div><strong>Longitude:</strong> {session.geoLng.toFixed(6)}</div>
                <div><strong>Saisie validée le:</strong> {new Date(session.geoTime).toLocaleString('fr-FR')}</div>
              </div>
            </div>
          )}

          {session.resources && session.resources.length > 0 && (
             <div className="card" style={{ marginBottom: '20px', padding: '24px' }}>
               <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '12px' }}>⊹ Pièces Jointes & Ressources</h4>
               <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                 {session.resources.map((res, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', color: 'var(--blue)' }}>
                      📄 {res.label}
                    </div>
                 ))}
               </div>
             </div>
          )}

          {session.signature && (
            <div className="card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '12px' }}>✦ Signature Manuscrite (Certifiée)</h4>
              <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <img src={session.signature} alt="Signature Validation" style={{ maxHeight: '100px', display: 'block' }} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '20px 32px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-gold" onClick={handleEdit}>⬦ Corriger / Éditer</button>
            <button className="btn btn-navy" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? 'Exportation...' : '◎ Exporter en PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
