import { useState } from 'react';
import { supabase } from '../supabaseClient';

export function useSuiviCollectif() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSuivi = async (annee) => {
    setLoading(true);
    try {
      const [teachersRes, assignmentsRes, avancementsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nom, prenom, avatar_initials, avatar_url, matricule')
          .eq('role', 'enseignant')
          .eq('is_active', true)
          .order('nom'),

        supabase
          .from('profile_classes')
          .select('profile_id, classe_id, classe:classe_id(id, nom, niveau)'),

        supabase
          .from('progression_avancement')
          .select('teacher_id, classe_id, classe_nom, done, total, updated_at')
          .eq('annee', annee),
      ]);

      const teachers    = teachersRes.data    || [];
      const assignments = assignmentsRes.data || [];
      const avancements = avancementsRes.data || [];

      const result = teachers.map(teacher => {
        const teacherAssignments = assignments.filter(a => a.profile_id === teacher.id);

        const classes = teacherAssignments.map(a => {
          const av = avancements.find(
            x => x.teacher_id === teacher.id && x.classe_id === a.classe_id
          );
          const done  = av?.done  || 0;
          const total = av?.total || 0;
          return {
            id:        a.classe_id,
            nom:       a.classe?.nom   || av?.classe_nom || '—',
            niveau:    a.classe?.niveau,
            done,
            total,
            pct:       total > 0 ? Math.round((done / total) * 100) : null,
            updatedAt: av?.updated_at || null,
          };
        });

        const globalDone  = classes.reduce((s, c) => s + c.done,  0);
        const globalTotal = classes.reduce((s, c) => s + c.total, 0);

        return {
          ...teacher,
          classes,
          globalDone,
          globalTotal,
          globalPct: globalTotal > 0 ? Math.round((globalDone / globalTotal) * 100) : null,
        };
      });

      // Classement : les plus avancés en premier, non démarrés en dernier
      result.sort((a, b) => {
        if (a.globalPct === null && b.globalPct === null) return 0;
        if (a.globalPct === null) return 1;
        if (b.globalPct === null) return -1;
        return b.globalPct - a.globalPct;
      });

      setData(result);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, fetchSuivi };
}
