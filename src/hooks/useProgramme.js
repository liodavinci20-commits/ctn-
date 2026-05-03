import { supabase } from '../supabaseClient';

export function useProgramme() {

  // Récupère (ou crée) un programme pour classe + matière
  const sortChapitres = (data) => {
    if (!data) return data;
    return {
      ...data,
      programme_chapitres: (data.programme_chapitres || [])
        .slice()
        .sort((a, b) => a.ordre - b.ordre),
    };
  };

  const getOrCreateProgramme = async (classeId, matiereId, userId) => {
    let { data } = await supabase
      .from('programmes')
      .select('*, programme_chapitres(*)')
      .eq('classe_id', classeId)
      .eq('matiere_id', matiereId)
      .maybeSingle();

    if (!data) {
      const { data: created } = await supabase
        .from('programmes')
        .insert({ classe_id: classeId, matiere_id: matiereId, created_by: userId })
        .select('*, programme_chapitres(*)')
        .single();
      data = created;
    }
    return sortChapitres(data);
  };

  const getProgramme = async (classeId, matiereId) => {
    const { data } = await supabase
      .from('programmes')
      .select('*, programme_chapitres(*)')
      .eq('classe_id', classeId)
      .eq('matiere_id', matiereId)
      .maybeSingle();
    return sortChapitres(data);
  };

  // Ajoute un chapitre
  const addChapitre = async (programmeId, titre, description, ordre) => {
    const { data, error } = await supabase
      .from('programme_chapitres')
      .insert({ programme_id: programmeId, titre, description: description || '', ordre })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  // Modifie un chapitre
  const updateChapitre = async (id, updates) => {
    const { error } = await supabase
      .from('programme_chapitres')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  };

  // Supprime un chapitre
  const deleteChapitre = async (id) => {
    const { error } = await supabase
      .from('programme_chapitres')
      .delete()
      .eq('id', id);
    if (error) throw error;
  };

  // IDs des chapitres déjà couverts par un enseignant dans un programme
  const getDoneChapitreIds = async (teacherId, programmeId) => {
    const { data: chapitres } = await supabase
      .from('programme_chapitres')
      .select('id')
      .eq('programme_id', programmeId);

    if (!chapitres || chapitres.length === 0) return [];

    const { data: progress } = await supabase
      .from('teacher_progress')
      .select('chapitre_id')
      .eq('teacher_id', teacherId)
      .in('chapitre_id', chapitres.map(c => c.id));

    return (progress || []).map(p => p.chapitre_id);
  };

  // Calcule la progression d'un enseignant sur un programme
  const getProgressPct = async (teacherId, programmeId) => {
    const { data: chapitres } = await supabase
      .from('programme_chapitres')
      .select('id')
      .eq('programme_id', programmeId);

    if (!chapitres || chapitres.length === 0) return { pct: 0, done: 0, total: 0 };

    const { data: progress } = await supabase
      .from('teacher_progress')
      .select('id')
      .eq('teacher_id', teacherId)
      .in('chapitre_id', chapitres.map(c => c.id));

    const done  = (progress || []).length;
    const total = chapitres.length;
    return { pct: Math.round((done / total) * 100), done, total };
  };

  // Marque un chapitre comme couvert
  const markChapitre = async (teacherId, chapitreId, sessionId = null) => {
    const { error } = await supabase
      .from('teacher_progress')
      .upsert(
        { teacher_id: teacherId, chapitre_id: chapitreId, session_id: sessionId, completed_at: new Date().toISOString() },
        { onConflict: 'teacher_id,chapitre_id' }
      );
    if (error) throw error;
  };

  // Retire la couverture d'un chapitre
  const unmarkChapitre = async (teacherId, chapitreId) => {
    await supabase
      .from('teacher_progress')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('chapitre_id', chapitreId);
  };

  return {
    getProgramme, getOrCreateProgramme,
    addChapitre, updateChapitre, deleteChapitre,
    getDoneChapitreIds, getProgressPct,
    markChapitre, unmarkChapitre,
  };
}
