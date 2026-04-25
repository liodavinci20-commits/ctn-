import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const EdtContext = createContext();

// Convertit une ligne Supabase → objet utilisé par EdtPage/CourseModal
const formatCourse = (row) => ({
  id:        row.id,
  teacherId: row.teacher_id,
  day:       row.jour,
  start:     row.heure_debut,
  end:       row.heure_fin,
  matiere:   row.matiere,
  classe:    row.classe,
  salle:     row.salle  || '',
  color:     row.couleur || 'blue',
});

export function EdtProvider({ children }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) fetchCourses();
    else setCourses([]);
  }, [user]);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at');

    if (error) console.error('Erreur fetch courses:', error.message);
    else setCourses((data || []).map(formatCourse));
    setLoading(false);
  };

  const getCoursesForTeacher = (teacherId) =>
    courses.filter(c => c.teacherId === teacherId);

  const addCourse = async (teacherId, formData) => {
    const { error } = await supabase.from('courses').insert({
      teacher_id:  teacherId,
      jour:        formData.day,
      heure_debut: formData.start,
      heure_fin:   formData.end,
      matiere:     formData.matiere || '',
      classe:      formData.classe  || '',
      salle:       formData.salle   || '',
      couleur:     formData.color   || 'blue',
    });
    if (error) throw error;
    await fetchCourses();
  };

  const updateCourse = async (teacherId, id, formData) => {
    const { error } = await supabase
      .from('courses')
      .update({
        jour:        formData.day,
        heure_debut: formData.start,
        heure_fin:   formData.end,
        matiere:     formData.matiere || '',
        classe:      formData.classe  || '',
        salle:       formData.salle   || '',
        couleur:     formData.color   || 'blue',
      })
      .eq('id', id);
    if (error) throw error;
    await fetchCourses();
  };

  const deleteCourse = async (teacherId, id) => {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchCourses();
  };

  return (
    <EdtContext.Provider value={{
      courses, loading, getCoursesForTeacher, addCourse, updateCourse, deleteCourse, fetchCourses,
    }}>
      {children}
    </EdtContext.Provider>
  );
}

export function useEdt() {
  return useContext(EdtContext);
}
