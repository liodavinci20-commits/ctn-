import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SessionDetailModal({ isOpen, onClose, session, user, onVisa }) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [visaLoading, setVisaLoading] = useState(false);

  if (!isOpen || !session) return null;

  const canVisa    = user?.role === 'admin' || user?.role === 'conseiller';
  const dejaVise   = !!session.visaAt;
  const isSignee   = !!session.signature;

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

  const handleVisa = async () => {
    if (!onVisa) return;
    setVisaLoading(true);
    await onVisa(session.id);
    setVisaLoading(false);
  };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1000, padding: '20px' }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        <div className="modal-header" style={{ padding: '24px 32px' }}>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--navy)' }}>
              ◎ Cahier de Texte : Fiche détaillée
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text3)' }}>
              Saisie du {session.date}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div id="pdf-content" className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>

          {/* Badges statut */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <span className="badge badge-info">{session.matiere}</span>
            <span className="badge badge-neutral">{session.classe}</span>
            {isSignee
              ? <span className="badge badge-success">✓ Signé électroniquement</span>
              : <span className="badge badge-danger">⚑ Non signé</span>
            }
            {dejaVise && (
              <span className="badge badge-success" style={{ background: 'rgba(26,140,122,0.15)', color: 'var(--teal)', border: '1px solid rgba(26,140,122,0.3)' }}>
                ◉ Visé par {session.visaName}
              </span>
            )}
          </div>

          {/* Contenu séance */}
          <div className="card" style={{ marginBottom: '20px', padding: '24px', borderLeft: '4px solid var(--gold)' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--navy)', marginBottom: '4px' }}>{session.title}</h2>
            {session.subtitle && (
              <h4 style={{ fontSize: '15px', color: 'var(--text2)', marginBottom: '16px', fontWeight: 500 }}>
                {session.subtitle}
              </h4>
            )}
            {session.plan && (
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '0.05em' }}>
                  Plan de la séance
                </strong>
                <p style={{ fontSize: '14px', color: 'var(--navy)', marginTop: '4px', fontWeight: 500 }}>{session.plan}</p>
              </div>
            )}
            <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Déroulement & Contenu
            </strong>
            <div style={{ fontSize: '14px', color: 'var(--text2)', background: 'var(--cream2)', padding: '16px', borderRadius: '8px', lineHeight: '1.6' }}>
              {session.content}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '12px' }}>◎ Compétences visées</h4>
              {session.competences?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {session.competences.map((c, i) => (
                    <span key={i} className="badge badge-neutral" style={{ fontSize: '12px' }}>{c}</span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>Aucune compétence renseignée.</span>
              )}
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '12px' }}>◈ Travail à faire</h4>
              {session.devoirs?.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {session.devoirs.map((d, i) => (
                    <li key={i}><strong>{d.date} :</strong> {d.desc}</li>
                  ))}
                </ul>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>Aucun devoir attribué.</span>
              )}
            </div>
          </div>

          {session.geoLat && session.geoLng && (
            <div className="card" style={{ marginBottom: '20px', padding: '24px', background: 'var(--cream)' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '8px' }}>📍 Localisation & Horodatage</h4>
              <div style={{ fontSize: '13px', color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <div><strong>Latitude :</strong> {session.geoLat.toFixed(6)}</div>
                <div><strong>Longitude :</strong> {session.geoLng.toFixed(6)}</div>
                <div><strong>Validée le :</strong> {new Date(session.geoTime).toLocaleString('fr-FR')}</div>
              </div>
            </div>
          )}

          {session.signature && (
            <div className="card" style={{ marginBottom: '20px', padding: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '12px' }}>✦ Signature Manuscrite</h4>
              <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <img src={session.signature} alt="Signature" style={{ maxHeight: '100px', display: 'block' }} />
              </div>
            </div>
          )}

          {/* Bloc visa existant */}
          {dejaVise && (
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--teal)', background: 'rgba(26,140,122,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>◉</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--teal)' }}>
                    Séance visée
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                    Par <strong>{session.visaName}</strong> le{' '}
                    {new Date(session.visaAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '20px 32px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

            {/* Bouton Viser — admin/conseiller uniquement, séance signée, pas encore visée */}
            {canVisa && isSignee && !dejaVise && (
              <button
                className="btn btn-teal"
                onClick={handleVisa}
                disabled={visaLoading}
                style={{ fontWeight: 700 }}
              >
                {visaLoading ? '…' : '◉ Viser cette séance'}
              </button>
            )}

            {/* Enseignant : bouton éditer */}
            {user?.role === 'enseignant' && (
              <button className="btn btn-gold" onClick={handleEdit}>⬦ Corriger / Éditer</button>
            )}

            <button className="btn btn-navy" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? 'Exportation...' : '◎ Exporter en PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
