import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const SessionsContext = createContext();

export function SessionsProvider({ children }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (user) fetchSessions();
    else setSessions([]);
  }, [user]);

  // Récupère toutes les séances (RLS filtre automatiquement selon le rôle)
  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        classes(nom, effectif),
        session_competences(id, texte),
        session_devoirs(id, description, date_limite)
      `)
      .order('date_cours', { ascending: false });

    if (error) {
      console.error('Erreur fetch sessions:', error.message);
    } else {
      setSessions((data || []).map(formatSession));
    }
    setLoading(false);
  };

  // Convertit une ligne Supabase en objet utilisé par les pages
  const formatSession = (row) => ({
    id:              row.id,
    teacherId:       row.teacher_id,
    dateCours:       row.date_cours,
    date:            row.date_cours
      ? new Date(row.date_cours).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
      : '',
    title:           row.titre,
    subtitle:        row.sous_titre || '',
    plan:            row.plan || '',
    matiere:         row.matiere || '',
    classe:          row.classes?.nom || '',
    classeId:        row.classe_id,
    content:         row.contenu || '',
    situationProbleme: row.situation_probleme || '',
    typeSeance:      row.type_seance || 'Cours',
    duree:           row.duree || '',
    sequence:        row.sequence || '',
    numeroSeance:    row.numero_seance,
    effectifPresent: row.effectif_present || 0,
    effectifTotal:   row.effectif_total || 0,
    progression:     row.progression || '',
    observations:    row.observations || '',
    competences:     (row.session_competences || []).map(c => c.texte),
    devoirs:         (row.session_devoirs || []).map(d => ({
      desc: d.description,
      date: d.date_limite || '',
    })),
    status:          row.status || 'done',
    geoLat:          row.geo_lat,
    geoLng:          row.geo_lng,
    geoTime:         row.geo_time,
    signature:       row.signature,
    visaBy:          row.visa_by   || null,
    visaAt:          row.visa_at   || null,
    visaName:        row.visa_name || null,
  });

  // Insère une nouvelle séance + ses compétences + ses devoirs
  const addSession = async (data) => {
    const { data: inserted, error } = await supabase
      .from('sessions')
      .insert({
        teacher_id:       data.teacherId,
        classe_id:        data.classeId || null,
        matiere:          data.matiere  || '',
        date_cours:       data.dateCours,
        titre:            data.title    || '',
        sous_titre:       data.subtitle || '',
        plan:             data.plan     || '',
        contenu:             data.content           || '',
        situation_probleme:  data.situationProbleme  || '',
        type_seance:         data.typeSeance         || 'Cours',
        duree:               data.duree              || '',
        sequence:            data.sequence           || '',
        numero_seance:    data.numeroSeance || null,
        effectif_present: data.effectifPresent || 0,
        effectif_total:   data.effectifTotal   || 0,
        progression:      data.progression || '',
        observations:     data.observations || '',
        signature:        data.signature || null,
        geo_lat:          data.geoLat   || null,
        geo_lng:          data.geoLng   || null,
        geo_time:         data.geoTime  || null,
        status:           'done',
      })
      .select()
      .single();

    if (error) throw error;

    // Compétences
    if (data.competences?.length > 0) {
      await supabase.from('session_competences').insert(
        data.competences.map(texte => ({ session_id: inserted.id, texte }))
      );
    }

    // Devoirs (on ignore les lignes vides)
    const devoirsValides = (data.devoirs || []).filter(d => d.desc?.trim());
    if (devoirsValides.length > 0) {
      await supabase.from('session_devoirs').insert(
        devoirsValides.map(d => ({
          session_id:  inserted.id,
          description: d.desc,
          date_limite: d.date || null,
        }))
      );
    }

    // Recharge la liste
    await fetchSessions();
    return inserted;
  };

  // Met à jour une séance existante
  const updateSession = async (id, data) => {
    const { error } = await supabase
      .from('sessions')
      .update({
        classe_id:        data.classeId || null,
        matiere:          data.matiere  || '',
        date_cours:       data.dateCours,
        titre:               data.title             || '',
        contenu:             data.content           || '',
        situation_probleme:  data.situationProbleme  || '',
        type_seance:         data.typeSeance         || 'Cours',
        signature:           data.signature         || null,
        geo_lat:          data.geoLat   || null,
        geo_lng:          data.geoLng   || null,
        geo_time:         data.geoTime  || null,
      })
      .eq('id', id);

    if (error) throw error;

    // Remplace compétences et devoirs (delete + re-insert)
    await supabase.from('session_competences').delete().eq('session_id', id);
    if (data.competences?.length > 0) {
      await supabase.from('session_competences').insert(
        data.competences.map(texte => ({ session_id: id, texte }))
      );
    }

    await supabase.from('session_devoirs').delete().eq('session_id', id);
    const devoirsValides = (data.devoirs || []).filter(d => d.desc?.trim());
    if (devoirsValides.length > 0) {
      await supabase.from('session_devoirs').insert(
        devoirsValides.map(d => ({
          session_id:  id,
          description: d.desc,
          date_limite: d.date || null,
        }))
      );
    }

    await fetchSessions();
  };

  const getTeacherSessions = (teacherId) =>
    sessions.filter(s => s.teacherId === teacherId);

  return (
    <SessionsContext.Provider value={{
      sessions, loading, getTeacherSessions, addSession, updateSession, fetchSessions,
    }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions() {
  return useContext(SessionsContext);
}
