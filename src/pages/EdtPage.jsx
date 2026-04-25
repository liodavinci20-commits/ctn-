import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEdt } from '../context/EdtContext';
import { useReferenceData } from '../hooks/useReferenceData';
import CourseModal from '../components/modals/CourseModal';

const COLOR_MAP = {
  blue:  { bg: 'rgba(27,108,168,0.08)',  border: '#1B6CA8', dot: '#1B6CA8'  },
  teal:  { bg: 'rgba(26,140,122,0.08)',  border: '#1A8C7A', dot: '#1A8C7A'  },
  gold:  { bg: 'rgba(201,147,58,0.10)',  border: '#C9933A', dot: '#C9933A'  },
  coral: { bg: 'rgba(217,95,75,0.08)',   border: '#D95F4B', dot: '#D95F4B'  },
  navy:  { bg: 'rgba(13,27,62,0.07)',    border: '#0D1B3E', dot: '#0D1B3E'  },
};

const DAYS  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const TIMES = [
  { label: '08h00 – 10h00', start: '08h00', end: '10h00' },
  { label: '10h00 – 12h00', start: '10h00', end: '12h00' },
  { label: '14h00 – 16h00', start: '14h00', end: '16h00' },
  { label: '16h00 – 18h00', start: '16h00', end: '18h00' },
];

export default function EdtPage({ teacherIdProp }) {
  const { user } = useAuth();
  const { getCoursesForTeacher, addCourse, updateCourse, deleteCourse, loading } = useEdt();
  const { myClasses } = useReferenceData(user?.id);

  const targetTeacherId = teacherIdProp || user?.id;
  const courses = getCoursesForTeacher(targetTeacherId);

  const [modalOpen, setModalOpen]       = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modalKey, setModalKey]         = useState(0);

  const getSlotCourse = (day, start) =>
    courses.find(c => c.day === day && c.start === start);

  const openModal = (course, day, start, end) => {
    setSelectedCourse(course || { day, start, end });
    setModalKey(k => k + 1); // force remount → form toujours vierge
    setModalOpen(true);
  };

  const handleSaveCourse = async (formData) => {
    if (selectedCourse?.id) {
      await updateCourse(targetTeacherId, selectedCourse.id, formData);
    } else {
      await addCourse(targetTeacherId, formData);
    }
    setModalOpen(false);
  };

  const handleDeleteCourse = async (id) => {
    await deleteCourse(targetTeacherId, id);
    setModalOpen(false);
  };

  return (
    <div className="page active fade-in">
      {!teacherIdProp && (
        <div className="section-title">
          <h3>◉ Emploi du Temps</h3>
          <p>Vue hebdomadaire · cliquez sur un créneau pour gérer vos cours</p>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>

        {/* En-tête des jours */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '72px repeat(5, 1fr)',
          background: 'var(--navy)',
        }}>
          <div style={{ padding: '14px 8px' }} />
          {DAYS.map(d => (
            <div key={d} style={{
              padding: '16px 8px',
              textAlign: 'center',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              color: '#fff',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              letterSpacing: '0.5px',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Lignes horaires */}
        {TIMES.map((time, ti) => (
          <div
            key={ti}
            style={{
              display: 'grid',
              gridTemplateColumns: '72px repeat(5, 1fr)',
              borderTop: '1px solid var(--border2)',
            }}
          >
            {/* Colonne heure */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 6px',
              gap: '2px',
              background: 'var(--cream)',
              borderRight: '1px solid var(--border2)',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--navy)' }}>
                {time.start}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text3)' }}>↕</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--navy)' }}>
                {time.end}
              </span>
            </div>

            {/* Cases jours */}
            {DAYS.map((day, di) => {
              const course = getSlotCourse(day, time.start);
              const colors = COLOR_MAP[course?.color] || COLOR_MAP.blue;

              return course ? (
                /* Créneau rempli */
                <div
                  key={di}
                  onClick={() => openModal(course, day, time.start, time.end)}
                  style={{
                    minHeight: '90px',
                    padding: '12px',
                    background: colors.bg,
                    borderLeft: `4px solid ${colors.border}`,
                    borderRight: di < 4 ? '1px solid var(--border2)' : 'none',
                    cursor: 'pointer',
                    transition: 'filter 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.96)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  {/* Matière */}
                  <div style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: '12px',
                    color: colors.border,
                    lineHeight: 1.2,
                  }}>
                    {course.matiere}
                  </div>

                  {/* Classe */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--navy)',
                  }}>
                    {course.classe}
                  </div>

                  {/* Salle */}
                  {course.salle && (
                    <div style={{
                      marginTop: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255,255,255,0.7)',
                      borderRadius: '20px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--text2)',
                      width: 'fit-content',
                    }}>
                      ◉ {course.salle}
                    </div>
                  )}
                </div>
              ) : (
                /* Créneau vide */
                <div
                  key={di}
                  onClick={() => openModal(null, day, time.start, time.end)}
                  style={{
                    minHeight: '90px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeft: '1px dashed var(--border2)',
                    borderRight: di < 4 ? '1px solid var(--border2)' : 'none',
                    cursor: 'pointer',
                    background: 'var(--white)',
                    transition: 'background 0.15s',
                    color: 'var(--border)',
                    fontSize: '20px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.color = 'var(--navy)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--border)'; }}
                >
                  +
                </div>
              );
            })}
          </div>
        ))}

        {/* État chargement */}
        {loading && (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
            Chargement de l'emploi du temps…
          </div>
        )}
      </div>

      {/* Récapitulatif */}
      {!teacherIdProp && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Séances planifiées</span>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--navy)' }}>
                {courses.length}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Heures / semaine</span>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--teal)' }}>
                {courses.length * 2}h
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text3)' }}>
              Cliquez sur un créneau <strong style={{ color: 'var(--navy)' }}>+</strong> pour ajouter · sur un cours pour modifier
            </div>
          </div>
        </div>
      )}

      <CourseModal
        key={modalKey}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        course={selectedCourse?.id ? selectedCourse : null}
        defaultSlot={selectedCourse?.id ? null : selectedCourse}
        onSave={handleSaveCourse}
        onDelete={handleDeleteCourse}
        classes={myClasses}
      />
    </div>
  );
}
