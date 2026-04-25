import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

// Emails des comptes démo
const DEMO_EMAILS = {
  enseignant: 'enseignant@ctn.cm',
  conseiller: 'conseiller@ctn.cm',
  admin:      'admin@ctn.cm',
};
const DEMO_PASSWORD = 'Demo@1234';

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupère la session active au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Écoute les changements de session (login / logout / refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Lit le profil dans la table `profiles` et construit l'objet user
  const fetchProfile = async (authUser) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) {
      // La table profiles n'existe pas encore ou profil absent — on déconnecte proprement
      console.warn('Profil introuvable :', error?.message);
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
      return;
    }

    setUser({
      id:         authUser.id,
      email:      authUser.email,
      nom:        profile.nom,
      prenom:     profile.prenom,
      name:       `${profile.prenom} ${profile.nom}`.trim(),
      role:       profile.role,
      matricule:  profile.matricule,
      avatar_url: profile.avatar_url || null,
      av:         profile.avatar_initials || `${profile.prenom[0] || ''}${profile.nom[0] || ''}`.toUpperCase(),
    });
    setLoading(false);
  };

  // Recharge le profil sans déconnecter (utile après upload photo)
  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) fetchProfile(session.user);
  };

  // Connexion email / mot de passe
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // Inscription — le trigger Supabase crée automatiquement le profil dans `profiles`
  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom:       metadata.nom       || '',
          prenom:    metadata.prenom    || '',
          role:      metadata.role      || 'enseignant',
          matricule: metadata.matricule || '',
        },
      },
    });
    if (error) throw error;
    return data;
  };

  // Déconnexion
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };
  const signOut = logout;

  // Connexion rapide démo — utilise les vrais comptes @ctn.cm
  const login = (role) => {
    const email = DEMO_EMAILS[role] || DEMO_EMAILS.enseignant;
    return signIn(email, DEMO_PASSWORD);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
