import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useReferenceData(userId = null) {
  const [classes, setClasses]     = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [matieres, setMatieres]   = useState([]);
  const [myMatieres, setMyMatieres] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);

    const [classesRes, matieresRes, myClassesRes, myMatieresRes] = await Promise.all([
      supabase.from('classes').select('*').order('nom'),
      supabase.from('matieres').select('*').order('nom'),
      supabase.from('profile_classes').select('classe_id').eq('profile_id', userId),
      supabase.from('profile_matieres').select('matiere_id').eq('profile_id', userId),
    ]);

    const allClasses  = classesRes.data  || [];
    const allMatieres = matieresRes.data || [];
    const myClasseIds  = (myClassesRes.data  || []).map(l => l.classe_id);
    const myMatiereIds = (myMatieresRes.data || []).map(l => l.matiere_id);

    setClasses(allClasses);
    setMatieres(allMatieres);
    setMyClasses(allClasses.filter(c => myClasseIds.includes(c.id)));
    setMyMatieres(allMatieres.filter(m => myMatiereIds.includes(m.id)));
    setLoading(false);
  };

  const getClasseIdByName  = (nom) => classes.find(c => c.nom === nom)?.id  || null;
  const getMatiereIdByName = (nom) => matieres.find(m => m.nom === nom)?.id || null;

  const saveMyClasses = async (selectedIds) => {
    await supabase.from('profile_classes').delete().eq('profile_id', userId);
    if (selectedIds.length > 0) {
      await supabase.from('profile_classes').insert(
        selectedIds.map(classe_id => ({ profile_id: userId, classe_id }))
      );
    }
    setMyClasses(classes.filter(c => selectedIds.includes(c.id)));
  };

  const saveMyMatieres = async (selectedIds) => {
    await supabase.from('profile_matieres').delete().eq('profile_id', userId);
    if (selectedIds.length > 0) {
      await supabase.from('profile_matieres').insert(
        selectedIds.map(matiere_id => ({ profile_id: userId, matiere_id }))
      );
    }
    setMyMatieres(matieres.filter(m => selectedIds.includes(m.id)));
  };

  return {
    classes, myClasses,
    matieres, myMatieres,
    loading,
    getClasseIdByName, getMatiereIdByName,
    saveMyClasses, saveMyMatieres,
    refetch: fetchData,
  };
}
