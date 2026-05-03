import React, { useState, useCallback } from 'react';

const MERGED_COLS = ['module'];

const COLUMNS = [
  { key: 'semaine', label: 'Semaine',                                  width: 145, vertical: false },
  { key: 'module',  label: 'Module',                                   width: 90,  vertical: true  },
  { key: 'titre',   label: "Titre de la lecon / Unite d'Enseignement", width: 420, vertical: false },
  { key: 'nature',  label: 'NATURE',                                   width: 58,  vertical: false },
];

const ROW_TYPES = ['cours', 'evaluation', 'activite', 'vacances'];

const ROW_STYLES = {
  cours:      { background: '#fff' },
  evaluation: { background: '#d9d9d9' },
  activite:   { background: '#e8e8e8' },
  vacances:   { background: '#f4cccc' },
};

const TYPE_LABELS = {
  cours:      'Cours',
  evaluation: 'Evaluation',
  activite:   "Activite d'integration",
  vacances:   'Conges / Vacances',
};

function computeSpans(rows) {
  const spans = {};
  MERGED_COLS.forEach(key => {
    spans[key] = new Array(rows.length).fill(1);
    let i = 0;
    while (i < rows.length) {
      const val = (rows[i][key] || '').trim();
      let j = i + 1;
      if (val) {
        while (j < rows.length && (rows[j][key] || '').trim() === val) j++;
      }
      spans[key][i] = j - i;
      for (let k = i + 1; k < j; k++) spans[key][k] = 0;
      i = j;
    }
  });
  return spans;
}

function emptyRow() {
  return {
    id: 'r-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    semaine: '', module: '', titre: '', nature: '', type: 'cours', fait: false,
  };
}

function pctColor(pct) {
  if (pct >= 75) return '#2f9e5a';
  if (pct >= 40) return '#f08c00';
  if (pct > 0)   return '#e05a2b';
  return '#bbb';
}

function EditCell({ value, onCommit, vertical, center, bold, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');

  const start  = () => { if (readOnly) return; setDraft(value); setEditing(true); };
  const commit = () => { setEditing(false); if (draft !== value) onCommit(draft); };
  const onKey  = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        style={{
          width: '100%', minHeight: vertical ? '80px' : '36px',
          padding: '4px 6px', border: '2px solid #1a3a6e',
          fontSize: '11px', resize: 'vertical', outline: 'none',
          boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.4,
          borderRadius: 0, background: '#fffde7',
        }}
      />
    );
  }

  return (
    <div
      onClick={start}
      style={{
        padding: vertical ? '8px 4px' : '5px 8px',
        minHeight: vertical ? '60px' : '28px',
        cursor: readOnly ? 'default' : 'text',
        fontSize: '11px',
        fontWeight: bold ? 700 : 'normal',
        lineHeight: 1.4,
        color: value ? '#1a1a1a' : (readOnly ? 'transparent' : '#ccc'),
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        textAlign: center ? 'center' : 'left',
        writingMode: vertical ? 'vertical-rl' : 'horizontal-tb',
        transform: vertical ? 'rotate(180deg)' : 'none',
        height: vertical ? '100%' : 'auto',
        display: 'flex',
        alignItems: vertical ? 'center' : 'flex-start',
        justifyContent: center ? 'center' : 'flex-start',
      }}
    >
      {value || (readOnly ? '' : '·')}
    </div>
  );
}

export default function FicheTableauDynamique({
  initialData,
  classeNom,
  annee,
  onSave,
  saving,
  readOnly,
}) {
  const data = initialData || [];
  const ro   = !!readOnly;

  const [rows, setRows] = useState(
    data.length
      ? data.map(r => ({ fait: false, type: 'cours', ...r, id: r.id || ('r-' + Math.random()) }))
      : [emptyRow()]
  );
  const [confirmClear, setConfirmClear] = useState(false);

  const spans    = computeSpans(rows);
  const doneCnt  = rows.filter(r => r.fait).length;
  const totalCnt = rows.length;
  const pct      = totalCnt > 0 ? Math.round((doneCnt / totalCnt) * 100) : 0;
  const barColor = pctColor(pct);

  const toggleFait = useCallback((id) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, fait: !r.fait } : r));
  }, []);

  const commitCell = useCallback((rowId, key, val) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [key]: val } : r));
  }, []);

  const commitMergedCell = useCallback((startIdx, key, val, spanCount) => {
    setRows(prev => {
      const next = [...prev];
      for (let i = startIdx; i < startIdx + spanCount; i++) {
        next[i] = { ...next[i], [key]: val };
      }
      return next;
    });
  }, []);

  const addRowAfter = (idx) => {
    const ctx = rows[idx];
    setRows(prev => {
      const next = [...prev];
      next.splice(idx + 1, 0, { ...emptyRow(), module: ctx.module });
      return next;
    });
  };

  const deleteRow = (id) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const moveRow = (idx, dir) => {
    const t = idx + dir;
    if (t < 0 || t >= rows.length) return;
    setRows(prev => {
      const next = [...prev];
      const tmp = next[idx]; next[idx] = next[t]; next[t] = tmp;
      return next;
    });
  };

  const cycleType = (id) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const i = ROW_TYPES.indexOf(r.type || 'cours');
      return { ...r, type: ROW_TYPES[(i + 1) % ROW_TYPES.length] };
    }));
  };

  const border      = '1px solid #555';
  const borderLight = '1px solid #bbb';

  const thStyle = (extra) => Object.assign({
    background: '#1a1a2e', color: '#fff',
    padding: '8px 6px', textAlign: 'center',
    fontSize: '10px', fontWeight: 700, border: border,
    whiteSpace: 'nowrap', letterSpacing: '0.05em',
    textTransform: 'uppercase',
  }, extra || {});

  return (
    <div>
      {/* En-tete + barre de progression */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: ro ? '8px' : '12px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>
            {classeNom} — Fiche de Progression {annee}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px', marginBottom: '8px' }}>
            {rows.length} ligne{rows.length !== 1 ? 's' : ''}
            {ro ? ' · Lecture seule' : ' · Cliquer une cellule pour editer · Cocher pour marquer effectuee'}
          </div>

          {/* Barre de progression */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '400px' }}>
            <div style={{ flex: 1, height: '10px', background: '#e9ecef', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: pct + '%',
                background: barColor, borderRadius: '6px',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: barColor, minWidth: '36px' }}>
              {pct}%
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
              {doneCnt}/{totalCnt} semaines effectuees
            </span>
          </div>
        </div>

        {/* Boutons d'action — caches en lecture */}
        {!ro && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setRows(prev => [...prev, emptyRow()])}>
              + Ligne
            </button>
            {confirmClear ? (
              <React.Fragment>
                <span style={{ fontSize: '11px', color: 'var(--coral)', fontWeight: 600 }}>Effacer tout ?</span>
                <button className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                  onClick={() => { setRows([emptyRow()]); setConfirmClear(false); }}>
                  Confirmer
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>
                  Annuler
                </button>
              </React.Fragment>
            ) : (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--coral)' }}
                onClick={() => setConfirmClear(true)}>
                x Effacer tout
              </button>
            )}
            <button className="btn btn-navy btn-sm"
              onClick={() => onSave(rows)} disabled={saving}
              style={{ minWidth: '110px' }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </div>

      {/* Legende — cachee en lecture */}
      {!ro && (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', fontSize: '10px', color: '#555', flexWrap: 'wrap' }}>
          {ROW_TYPES.map(type => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                display: 'inline-block', width: '12px', height: '12px',
                background: ROW_STYLES[type].background, border: '1px solid #bbb', borderRadius: '2px',
              }} />
              {TYPE_LABELS[type]}
            </div>
          ))}
          <span style={{ color: '#aaa' }}>· changer le type : bouton carre · cocher = effectuee</span>
        </div>
      )}

      {/* Tableau */}
      <div style={{
        overflowX: 'auto', borderRadius: '4px',
        border: '2px solid #333', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        maxWidth: '960px',
      }}>
        <table style={{
          borderCollapse: 'collapse', width: '960px',
          tableLayout: 'fixed', fontFamily: 'Arial, sans-serif',
        }}>
          <colgroup>
            <col style={{ width: '36px' }} />
            {COLUMNS.map(c => (
              <col key={c.key} style={{ width: c.width + 'px' }} />
            ))}
            {!ro && <col style={{ width: '52px' }} />}
          </colgroup>

          <thead>
            <tr>
              <th style={thStyle({ verticalAlign: 'middle', padding: '8px 4px' })}>v</th>
              {COLUMNS.map(c => (
                <th key={c.key} style={thStyle({
                  verticalAlign: 'middle',
                  writingMode: c.vertical ? 'vertical-rl' : 'horizontal-tb',
                  transform: c.vertical ? 'rotate(180deg)' : 'none',
                  padding: c.vertical ? '14px 6px' : '8px 6px',
                })}>
                  {c.label}
                </th>
              ))}
              {!ro && (
                <th style={thStyle({
                  background: '#0d1b3e', fontSize: '9px',
                  color: 'rgba(255,255,255,0.35)', verticalAlign: 'middle',
                })}>
                  actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const rowType   = row.type || 'cours';
              const isFait    = !!row.fait;
              const isSpecial = rowType !== 'cours';
              const rowBg     = isFait ? { background: '#f0fff4' } : ROW_STYLES[rowType];

              return (
                <tr key={row.id} style={{ opacity: isFait ? 0.82 : 1 }}>

                  {/* Checkbox fait */}
                  <td style={{
                    border: borderLight, textAlign: 'center', verticalAlign: 'middle',
                    padding: '4px', background: isFait ? '#f0fff4' : '#fafafa',
                    borderRight: '2px solid #555',
                  }}>
                    <input
                      type="checkbox"
                      checked={isFait}
                      onChange={ro ? undefined : () => toggleFait(row.id)}
                      readOnly={ro}
                      style={{ width: '15px', height: '15px', cursor: ro ? 'default' : 'pointer', accentColor: '#2f9e5a' }}
                    />
                  </td>

                  {/* Cellules de donnees */}
                  {COLUMNS.map(col => {
                    const isMerged = MERGED_COLS.includes(col.key);

                    if (isMerged) {
                      const span = spans[col.key][idx];
                      if (span === 0) return null;
                      return (
                        <td key={col.key} rowSpan={span} style={{
                          border: borderLight, verticalAlign: 'middle', padding: 0,
                          background: '#e8edf8', borderRight: '2px solid #555',
                        }}>
                          <EditCell
                            value={row[col.key] || ''}
                            vertical={col.vertical}
                            onCommit={val => commitMergedCell(idx, col.key, val, span)}
                            readOnly={ro}
                          />
                        </td>
                      );
                    }

                    const isNature  = col.key === 'nature';
                    const isTitre   = col.key === 'titre';
                    const isSemaine = col.key === 'semaine';

                    return (
                      <td key={col.key} style={Object.assign({
                        border: borderLight, verticalAlign: 'middle', padding: 0,
                        textDecoration: isFait && isTitre ? 'line-through' : 'none',
                      }, rowBg)}>
                        <EditCell
                          value={row[col.key] || ''}
                          center={isNature || isSemaine || (isSpecial && isTitre)}
                          bold={isSpecial && isTitre}
                          onCommit={val => commitCell(row.id, col.key, val)}
                          readOnly={ro}
                        />
                      </td>
                    );
                  })}

                  {/* Boutons de ligne — caches en lecture */}
                  {!ro && (
                    <td style={{
                      border: borderLight, borderLeft: '2px solid #555',
                      textAlign: 'center', verticalAlign: 'middle',
                      padding: '2px', background: '#f8f9fa',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center' }}>
                        {[
                          { label: '^', action: () => moveRow(idx, -1), disabled: idx === 0,               color: '#999'    },
                          { label: '+', action: () => addRowAfter(idx),  disabled: false,                   color: '#2f9e5a' },
                          { label: 'T', action: () => cycleType(row.id), disabled: false,                   color: '#7b61ff' },
                          { label: 'x', action: () => deleteRow(row.id), disabled: rows.length <= 1,        color: '#e05a2b' },
                          { label: 'v', action: () => moveRow(idx,  1),  disabled: idx === rows.length - 1, color: '#999'    },
                        ].map((btn, i) => (
                          <button key={i} onClick={btn.action} disabled={btn.disabled}
                            style={{
                              background: 'none', border: 'none',
                              cursor: btn.disabled ? 'default' : 'pointer',
                              fontSize: '11px',
                              color: btn.disabled ? '#ddd' : btn.color,
                              padding: '1px 3px', lineHeight: 1, fontWeight: 700,
                            }}>
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!ro && (
        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text3)', textAlign: 'right' }}>
          v cocher = effectuee · ^ v deplacer · + inserer · T type · x supprimer · clic cellule pour editer
        </div>
      )}
    </div>
  );
}
