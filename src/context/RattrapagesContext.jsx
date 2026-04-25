import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const RattrapagesContext = createContext();

const formatRattrapage = (row) => ({
  id:           row.id,
  teacherId:    row.teacher_id,
  teacherName:  row.teacher_name,
  classe:       row.classe,
  classeId:     row.classe_id,
  date:         row.date_proposee,
  creneau:      row.creneau,
  motif:        row.motif,
  status:       row.status,
  decidedBy:    row.decided_by,
  decidedAt:    row.decided_at,
  createdAt:    row.created_at,
});

export function RattrapagesProvider({ children }) {
  const { user } = useAuth();
  const [rattrapages, setRattrapages] = useState([]);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (user) fetchRattrapages();
    else setRattrapages([]);
  }, [user?.id]);

  const fetchRattrapages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rattrapages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Erreur fetch rattrapages:', error.message);
    else setRattrapages((data || []).map(formatRattrapage));
    setLoading(false);
  };

  const getPending = () => rattrapages.filter(r => r.status === 'pending');

  const addRattrapage = async (data) => {
    const { error } = await supabase.from('rattrapages').insert({
      teacher_id:    data.teacherId,
      teacher_name:  data.teacherName || '',
      classe:        data.classe      || '',
      classe_id:     data.classeId    || null,
      date_proposee: data.date,
      creneau:       data.creneau     || '',
      motif:         data.motif       || '',
      status:        'pending',
    });
    if (error) throw error;
    await fetchRattrapages();
  };

  const updateStatus = async (id, status, decidedById = null) => {
    const { error } = await supabase
      .from('rattrapages')
      .update({
        status,
        decided_by: decidedById || user?.id,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
    await fetchRattrapages();
  };

  return (
    <RattrapagesContext.Provider value={{
      rattrapages, loading, getPending, addRattrapage, updateStatus, fetchRattrapages,
    }}>
      {children}
    </RattrapagesContext.Provider>
  );
}

export function useRattrapages() {
  return useContext(RattrapagesContext);
}
