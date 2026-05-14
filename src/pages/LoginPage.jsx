import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MENUS } from '../data/mockData';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({ nom: '', prenom: '', email: '', matricule: '', password: '', confirmPassword: '', role: 'enseignant' });

  const executeLogin = async (email, password) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const u = await signIn(email, password);
      const userRole = u?.role || 'enseignant';
      const menu = MENUS[userRole] || MENUS['enseignant'];
      navigate(menu[0]?.path || '/dashboard');
    } catch (error) {
      console.error(error);
      setErrorMsg('Identifiants incorrects ou compte inexistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    executeLogin(loginData.email, loginData.password);
  };

  const handleDemoLogin = async (role) => {
    // Les comptes de tests doivent exister dans l'auth Supabase avec ces identifiants
    const testEmail = `${role}@ctn.cm`;
    const testPass = 'Demo@1234';
    executeLogin(testEmail, testPass);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (regData.password !== regData.confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }
    
    setLoading(true);
    try {
      const metadata = {
        nom: regData.nom,
        prenom: regData.prenom,
        matricule: regData.matricule,
        role: regData.role
      };
      
      const u = await signUp(regData.email, regData.password, metadata);
      const userRole = u?.role || regData.role;
      const menu = MENUS[userRole] || MENUS['enseignant'];
      navigate(menu[0]?.path || '/dashboard');
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="page-login" style={{ display: 'flex' }}>
      <div className="login-deco"></div>

      {/* LEFT SIDE */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">C</div>
          <div>
            <div className="login-brand-name">CTN Lycée</div>
            <div className="login-brand-sub">Cahier de Texte Numérique</div>
          </div>
        </div>

        <div className="login-headline">
          <h1>Le savoir,<br /><span>tracé avec</span><br />précision.</h1>
          <p>Une plateforme complète pour documenter, suivre et archiver le parcours pédagogique de chaque classe.</p>
        </div>

        <div className="login-features">
          <div className="login-feature"><div className="login-feature-dot"></div><span>Saisie structurée des séances avec signature numérique</span></div>
          <div className="login-feature"><div className="login-feature-dot"></div><span>Suivi de progression en temps réel par le conseiller pédagogique</span></div>
          <div className="login-feature"><div className="login-feature-dot"></div><span>Notifications intelligentes et propositions de rattrapage</span></div>
          <div className="login-feature"><div className="login-feature-dot"></div><span>Archivage légal sécurisé sur 5 ans minimum</span></div>
        </div>

        <div style={{ display: 'flex', gap: '32px', marginTop: '48px' }}>
          {[
            { val: '28', label: 'Enseignants' },
            { val: '847', label: 'Élèves' },
            { val: '312', label: 'Séances' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 800, color: 'var(--gold2)' }}>{s.val}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right">
        <div className="login-form" style={{ maxWidth: '380px', width: '100%' }}>

          {/* ===== CONNEXION ===== */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              <h2>Connexion</h2>
              <p>Accédez à votre espace personnel</p>

              {errorMsg && (
                <div style={{ padding: '10px 14px', background: 'rgba(217,95,75,0.1)', color: 'var(--coral)', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid rgba(217,95,75,0.2)' }}>
                  {errorMsg}
                </div>
              )}

              <div className="form-group">
                <label>Adresse Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="nom@etablissement.cm"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '16px', color: 'var(--text3)', padding: '4px',
                    }}
                  >
                    {showPassword ? '◉' : '◎'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--blue)', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                  Mot de passe oublié ?
                </button>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Connexion en cours...' : 'Se connecter ›'}
              </button>

              {/* LIEN VERS INSCRIPTION */}
              <div style={{
                textAlign: 'center', marginTop: '24px', padding: '16px',
                background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--border2)'
              }}>
                <p style={{ fontSize: '13px', color: 'var(--text3)', margin: 0 }}>
                  Vous n'avez pas de compte ?
                </p>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--navy)', fontWeight: 700, fontSize: '14px',
                    fontFamily: "'Syne', sans-serif", marginTop: '6px',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  ✦ Créer un compte
                </button>
              </div>

            </form>
          )}

          {/* ===== INSCRIPTION ===== */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', color: 'var(--text3)', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px',
                  padding: 0,
                }}
              >
                ‹ Retour à la connexion
              </button>

              <h2>Créer un compte</h2>
              <p>Rejoignez la plateforme CTN du lycée</p>

              {errorMsg && (
                <div style={{ padding: '10px 14px', background: 'rgba(217,95,75,0.1)', color: 'var(--coral)', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid rgba(217,95,75,0.2)' }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Nom <span style={{ color: 'var(--coral)' }}>*</span></label>
                  <input type="text" className="form-input" placeholder="Ex: Kamga" required value={regData.nom} onChange={(e) => setRegData({ ...regData, nom: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Prénom <span style={{ color: 'var(--coral)' }}>*</span></label>
                  <input type="text" className="form-input" placeholder="Ex: Denis" required value={regData.prenom} onChange={(e) => setRegData({ ...regData, prenom: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Adresse email <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input type="email" className="form-input" placeholder="nom@etablissement.cm" required value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Matricule <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input type="text" className="form-input" placeholder="Ex: ENS2024001" required value={regData.matricule} onChange={(e) => setRegData({ ...regData, matricule: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Profil <span style={{ color: 'var(--coral)' }}>*</span></label>
                <select className="form-input" value={regData.role} onChange={(e) => setRegData({ ...regData, role: e.target.value })} style={{ cursor: 'pointer', paddingRight: '36px', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A88A8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
                  <option value="enseignant">✦ Enseignant(e)</option>
                  <option value="conseiller">✶ Conseiller Pédagogique</option>
                  <option value="admin">⬥ Administrateur Système</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Mot de passe <span style={{ color: 'var(--coral)' }}>*</span></label>
                  <input type="password" className="form-input" placeholder="Min. 6 caractères" required minLength={6} value={regData.password} onChange={(e) => setRegData({ ...regData, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Confirmer <span style={{ color: 'var(--coral)' }}>*</span></label>
                  <input type="password" className="form-input" placeholder="Répéter" required value={regData.confirmPassword} onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '24px', fontSize: '12px', color: 'var(--text2)' }}>
                <input type="checkbox" required style={{ accentColor: 'var(--navy)', marginTop: '2px' }} />
                <span>J'accepte les <strong style={{ color: 'var(--navy)' }}>conditions d'utilisation</strong> et la <strong style={{ color: 'var(--navy)' }}>politique de confidentialité</strong> de la plateforme CTN.</span>
              </label>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Création...' : '✦ Créer mon compte'}
              </button>

              <div style={{
                textAlign: 'center', marginTop: '24px', padding: '16px',
                background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--border2)'
              }}>
                <p style={{ fontSize: '13px', color: 'var(--text3)', margin: 0 }}>
                  Vous avez déjà un compte ?
                </p>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--navy)', fontWeight: 700, fontSize: '14px',
                    fontFamily: "'Syne', sans-serif", marginTop: '6px',
                  }}
                >
                  ◉ Se connecter
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
