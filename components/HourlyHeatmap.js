// components/HourlyHeatmap.js
// Hourly productivity heatmap for "Tổng quan" tab.
// Both Nhóm and Ngành hàng filters support MULTI-CHOICE selection.

import { useState, useMemo, useRef, useEffect } from 'react';

const HOUR_LABELS = ['14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00'];

const GROUP_COLORS = {
  'PST':          { bg: '#3B82F6', badge: '#60A5FA' }, // Blue
  'NVCT':         { bg: '#F59E0B', badge: '#FCD34D' }, // Amber
  'Green Human':  { bg: '#10B981', badge: '#34D399' }, // Green
  'HUYHOANG':     { bg: '#9333EA', badge: '#C084FC' }, // Purple
  'Others (Hub)': { bg: '#3a3a3a', badge: '#9E9E9E' },
};

// Heat colour: transparent → teal → green → amber → red
function heatColor(val, max) {
  if (!val || !max) return 'transparent';
  const ratio = Math.min(val / max, 1);
  if (ratio < 0.01) return 'transparent';
  const stops = [
    [0.00, [30,  120, 140]],
    [0.25, [45,  170,  90]],
    [0.50, [200, 190,  40]],
    [0.75, [230, 130,  20]],
    [1.00, [210,  50,  30]],
  ];
  let r=stops[0][1][0], g=stops[0][1][1], b=stops[0][1][2];
  for (let i = 1; i < stops.length; i++) {
    if (ratio <= stops[i][0]) {
      const t = (ratio - stops[i-1][0]) / (stops[i][0] - stops[i-1][0]);
      r = Math.round(stops[i-1][1][0] + t*(stops[i][1][0]-stops[i-1][1][0]));
      g = Math.round(stops[i-1][1][1] + t*(stops[i][1][1]-stops[i-1][1][1]));
      b = Math.round(stops[i-1][1][2] + t*(stops[i][1][2]-stops[i-1][1][2]));
      break;
    }
  }
  return `rgba(${r},${g},${b},${0.25 + ratio * 0.65})`;
}

// ── Multi-select dropdown for Ngành hàng ───────────────────
function MultiDropdown({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const allSelected = selected.length === 0 || selected.length === options.length;
  const label = allSelected
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} ngành đã chọn`;

  function toggle(opt) {
    if (selected.includes(opt)) {
      const next = selected.filter(s => s !== opt);
      onChange(next.length === options.length ? [] : next);
    } else {
      const next = [...selected, opt];
      onChange(next.length === options.length ? [] : next);
    }
  }

  function toggleAll() { onChange([]); }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: `1.5px solid ${open ? 'rgba(56,115,182,0.6)' : 'rgba(255,255,255,0.18)'}`,
          borderRadius: '8px',
          color: allSelected ? 'var(--text-muted)' : 'var(--text-primary)',
          fontSize: '0.78rem',
          padding: '0.3rem 0.8rem 0.3rem 0.65rem',
          cursor: 'pointer',
          minWidth: '170px',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ opacity: 0.5, fontSize: '0.65rem', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 999,
          background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid rgba(147, 51, 234, 0.4)',
          borderRadius: '10px', minWidth: '200px', maxHeight: '280px', overflowY: 'auto',
          boxShadow: 'var(--shadow-card)',
          padding: '0.4rem 0',
        }}>
          {/* Select all */}
          <div
            onClick={toggleAll}
            style={{
              padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem',
              color: allSelected ? '#4A90E2' : 'var(--text-muted)',
              fontWeight: allSelected ? 700 : 400,
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              marginBottom: '0.25rem',
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0,
              border: `1.5px solid ${allSelected ? '#4A90E2' : 'rgba(255,255,255,0.3)'}`,
              background: allSelected ? '#4A90E2' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6rem', color: '#fff',
            }}>
              {allSelected && '✓'}
            </span>
            Tất cả ngành
          </div>

          {options.map(opt => {
            const checked = selected.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem',
                  color: checked ? '#fff' : 'var(--text-muted)',
                  background: checked ? 'rgba(56,115,182,0.15)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = checked ? 'rgba(56,115,182,0.2)' : 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = checked ? 'rgba(56,115,182,0.15)' : 'transparent'}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${checked ? '#4A90E2' : 'rgba(255,255,255,0.3)'}`,
                  background: checked ? '#4A90E2' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', color: '#fff',
                }}>
                  {checked && '✓'}
                </span>
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────
export default function HourlyHeatmap({ hourlyRows, date, valueKey = 'tongKg', valueLabel = 'KG', unit = 'kg' }) {
  // Multi-select: empty array = ALL selected
  const [selectedNhom,  setSelectedNhom]  = useState([]);
  const [selectedNganh, setSelectedNganh] = useState([]);
  const [sortBy,        setSortBy]        = useState('value');

  // Filter to selected date
  const dateRows = useMemo(() =>
    hourlyRows.filter(r => r.date === date),
    [hourlyRows, date]
  );

  // Unique options (without ALL entry — handled separately)
  const nhomOptions  = useMemo(() => [...new Set(dateRows.map(r => r.nhom).filter(Boolean))], [dateRows]);
  const nganhOptions = useMemo(() => [...new Set(dateRows.map(r => r.nganh).filter(Boolean))].sort(), [dateRows]);

  // Toggle single nhom (multi-select)
  function toggleNhom(n) {
    setSelectedNhom(prev => {
      if (prev.includes(n)) {
        const next = prev.filter(x => x !== n);
        return next;
      } else {
        const next = [...prev, n];
        // If all selected → reset to empty (= ALL)
        return next.length === nhomOptions.length ? [] : next;
      }
    });
  }

  function clearNhom() { setSelectedNhom([]); }
  function clearNganh() { setSelectedNganh([]); }

  const nhomAllSelected  = selectedNhom.length  === 0;
  const nganhAllSelected = selectedNganh.length === 0;

  // Apply filters
  const filtered = useMemo(() => {
    let rows = dateRows;
    if (!nhomAllSelected)  rows = rows.filter(r => selectedNhom.includes(r.nhom));
    if (!nganhAllSelected) rows = rows.filter(r => selectedNganh.includes(r.nganh));
    return rows;
  }, [dateRows, selectedNhom, selectedNganh, nhomAllSelected, nganhAllSelected]);

  // Aggregate by worker
  const workerRows = useMemo(() => {
    const map = new Map();
    filtered.forEach(r => {
      const key = `${r.nhom}|||${r.nguoi}`;
      if (!map.has(key)) {
        map.set(key, { nhom: r.nhom, nguoi: r.nguoi, [valueKey]: 0, hours: Object.fromEntries(HOUR_LABELS.map(h => [h, 0])) });
      }
      const entry = map.get(key);
      entry[valueKey] += r[valueKey] || 0;
      for (const h of HOUR_LABELS) entry.hours[h] = (entry.hours[h] || 0) + (r.hours?.[h] || 0);
    });
    const arr = Array.from(map.values());
    arr.forEach(row => {
      let activeH = 0;
      for (const h of HOUR_LABELS) {
        if (row.hours[h] > 0) activeH++;
      }
      row.activeHours = activeH;
    });

    if (sortBy === 'value') arr.sort((a, b) => b[valueKey] - a[valueKey]);
    else arr.sort((a, b) => a.nguoi.localeCompare(b.nguoi));
    return arr;
  }, [filtered, sortBy, valueKey]);

  const maxCell    = useMemo(() => { let m=0; workerRows.forEach(r => HOUR_LABELS.forEach(h => { if (r.hours[h]>m) m=r.hours[h]; })); return m; }, [workerRows]);
  const hourTotals = useMemo(() => { const t={}; for (const h of HOUR_LABELS) t[h]=workerRows.reduce((s,r)=>s+(r.hours[h]||0),0); return t; }, [workerRows]);
  const grandTotal = useMemo(() => workerRows.reduce((s, r) => s + (r[valueKey] || 0), 0), [workerRows, valueKey]);
  const totalActiveHours = useMemo(() => workerRows.reduce((s, r) => s + (r.activeHours || 0), 0), [workerRows]);

  const hasFilter = !nhomAllSelected || !nganhAllSelected;

  if (!dateRows.length) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        ⏳ Chưa có dữ liệu giờ — sẽ có sau khi agent chạy lần tiếp theo
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>

      {/* ─── Filter bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1rem' }}>

        {/* Nhóm — multi-choice pill buttons */}
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
            Nhóm nhân sự
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* ALL button */}
            <button onClick={clearNhom} style={{
              padding: '0.25rem 0.65rem', borderRadius: '99px', fontSize: '0.74rem', fontWeight: nhomAllSelected ? 700 : 400,
              border: `1.5px solid ${nhomAllSelected ? '#4A6A8A' : 'rgba(255,255,255,0.13)'}`,
              background: nhomAllSelected ? '#4A6A8A' : 'rgba(255,255,255,0.04)',
              color: nhomAllSelected ? '#fff' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              Tất cả
            </button>
            {nhomOptions.map(n => {
              const active = selectedNhom.includes(n);
              const col = GROUP_COLORS[n]?.bg || '#555';
              return (
                <button key={n} onClick={() => toggleNhom(n)} style={{
                  padding: '0.25rem 0.65rem', borderRadius: '99px', fontSize: '0.74rem', fontWeight: active ? 700 : 400,
                  border: `1.5px solid ${active ? col : 'rgba(255,255,255,0.13)'}`,
                  background: active ? col : 'rgba(255,255,255,0.04)',
                  color: active ? '#fff' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s',
                  position: 'relative',
                }}>
                  {n}
                  {active && (
                    <span style={{
                      marginLeft: '0.3rem', fontSize: '0.6rem', opacity: 0.8,
                      background: 'rgba(255,255,255,0.3)', borderRadius: '99px',
                      padding: '0 0.2rem',
                    }}>✓</span>
                  )}
                </button>
              );
            })}
            {!nhomAllSelected && (
              <span style={{ fontSize: '0.7rem', color: '#4A90E2', cursor: 'pointer', marginLeft: 2 }} onClick={clearNhom}>
                ✕ Bỏ chọn
              </span>
            )}
          </div>
        </div>

        {/* Ngành hàng — multi-choice dropdown */}
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Ngành hàng
            {!nganhAllSelected && (
              <span style={{ fontSize: '0.68rem', color: '#4A90E2', fontWeight: 400, cursor: 'pointer', textTransform: 'none' }} onClick={clearNganh}>
                ✕ Bỏ chọn ({selectedNganh.length})
              </span>
            )}
          </div>
          <MultiDropdown
            options={nganhOptions}
            selected={selectedNganh}
            onChange={setSelectedNganh}
            placeholder="— Tất cả ngành —"
          />
        </div>

        {/* Sort */}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
            Sắp xếp
          </div>
          <button onClick={() => setSortBy(s => s === 'value' ? 'worker' : 'value')} style={{
            padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem',
            border: '1.5px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {sortBy === 'value' ? `↓ Theo ${valueLabel}` : '🔤 Theo tên'}
          </button>
        </div>
      </div>

      {/* ─── Active filter chips ─────────────────────────────────── */}
      {hasFilter && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {!nhomAllSelected && selectedNhom.map(n => (
            <span key={n} onClick={() => toggleNhom(n)} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: GROUP_COLORS[n]?.bg || '#444',
              color: '#fff', fontSize: '0.72rem', fontWeight: 600,
              padding: '0.2rem 0.55rem', borderRadius: '99px', cursor: 'pointer',
            }}>
              {n} <span style={{ opacity: 0.7 }}>✕</span>
            </span>
          ))}
          {!nganhAllSelected && selectedNganh.map(n => (
            <span key={n} onClick={() => setSelectedNganh(prev => prev.filter(x => x !== n))} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: 'rgba(56,115,182,0.3)', border: '1px solid rgba(56,115,182,0.5)',
              color: '#90bfff', fontSize: '0.72rem', fontWeight: 600,
              padding: '0.2rem 0.55rem', borderRadius: '99px', cursor: 'pointer',
            }}>
              📦 {n} <span style={{ opacity: 0.7 }}>✕</span>
            </span>
          ))}
          <span onClick={() => { clearNhom(); clearNganh(); }} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
            color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer',
            padding: '0.2rem 0.4rem',
          }}>
            ✕ Xóa tất cả filter
          </span>
        </div>
      )}

      {/* ─── Stats strip ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <StatChip icon="👤" label="Nhân sự" val={workerRows.length} unit="người" />
        <StatChip icon="⚖️" label={`Tổng ${valueLabel}`} val={grandTotal.toFixed(1)} unit={unit} />
        <StatChip icon="⏱️" label="Giờ cao điểm" val={getPeakHour(hourTotals)} unit="" />
      </div>

      {/* ─── Heatmap table ──────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '900px' }}>
          <thead>
            <tr>
              <th style={thStyle('left', 42)}>Nhóm</th>
              <th style={thStyle('left', 130)}>Người chia hàng</th>
              {HOUR_LABELS.map(h => (
                <th key={h} style={thStyle('center', 52)}>
                  <span style={{ fontSize: '0.7rem', color: isNight(h) ? '#90bfff' : '#f0d06a' }}>{h}</span>
                </th>
              ))}
              <th style={thStyle('right', 70)}>Tổng {valueLabel}</th>
              <th style={thStyle('right', 90)}>TB {valueLabel}/Người/Giờ</th>
            </tr>
          </thead>
          <tbody>
            {workerRows.map((row, i) => {
              const col = GROUP_COLORS[row.nhom] || GROUP_COLORS['Others (Hub)'];
              const avgPerHour = row.activeHours > 0 ? (row[valueKey] / row.activeHours) : 0;
              return (
                <tr key={`${row.nhom}-${row.nguoi}-${i}`} style={{
                  background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent',
                }}>
                  <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ display: 'inline-block', background: col.bg, color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                      {row.nhom}
                    </span>
                  </td>
                  <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                    {row.nguoi}
                  </td>
                  {HOUR_LABELS.map(h => {
                    const val = row.hours[h] || 0;
                    return (
                      <td key={h} title={`${row.nguoi} · ${h}: ${val.toFixed(3)} ${unit}`} style={{
                        padding: '0.3rem 0.2rem', textAlign: 'center',
                        background: heatColor(val, maxCell),
                        color: val > maxCell * 0.4 ? '#fff' : 'var(--text-secondary)',
                        fontWeight: val > maxCell * 0.3 ? 600 : 400,
                        fontSize: '0.7rem',
                        borderRight: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.2s',
                      }}>
                        {val > 0 ? val.toFixed(1) : <span style={{ opacity: 0.2 }}>—</span>}
                      </td>
                    );
                  })}
                  <td style={{ padding: '0.35rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#F0D06A', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    {(row[valueKey] || 0).toFixed(1)}
                  </td>
                  <td style={{ padding: '0.35rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--amber)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    {avgPerHour.toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr style={{ background: 'rgba(147, 51, 234, 0.15)', borderTop: '2px solid rgba(147, 51, 234, 0.4)' }}>
              <td colSpan={2} style={{ padding: '0.5rem 0.6rem', fontWeight: 700, color: '#fff', fontSize: '0.8rem' }}>
                ∑ Tổng ({workerRows.length} người)
              </td>
              {HOUR_LABELS.map(h => {
                const val = hourTotals[h] || 0;
                return (
                  <td key={h} style={{ padding: '0.4rem 0.2rem', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: val > 0 ? '#90e0ef' : 'rgba(255,255,255,0.2)' }}>
                    {val > 0 ? val.toFixed(1) : '—'}
                  </td>
                );
              })}
              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#F0D06A', fontSize: '0.85rem' }}>
                {grandTotal.toFixed(1)}
              </td>
              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--amber)', fontSize: '0.85rem' }}>
                {totalActiveHours > 0 ? (grandTotal / totalActiveHours).toFixed(2) : 0}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Màu sắc theo {unit}/giờ:</span>
        {[0.1, 0.3, 0.6, 0.9].map(r => (
          <span key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: heatColor(r, 1), display: 'inline-block', border: '1px solid rgba(255,255,255,0.15)' }} />
            {r < 0.25 ? 'Thấp' : r < 0.5 ? 'TB' : r < 0.75 ? 'Cao' : 'Đỉnh'}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────
function StatChip({ icon, label, val, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.3rem 0.65rem' }}>
      <span style={{ fontSize: '0.85rem' }}>{icon}</span>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
      {val !== '' && <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{val}</strong>}
      {unit && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{unit}</span>}
    </div>
  );
}

function thStyle(align, minW) {
  return {
    padding: '0.55rem 0.4rem', textAlign: align,
    background: 'rgba(12, 16, 36, 0.85)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', 
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '2px solid rgba(147, 51, 234, 0.35)',
    position: 'sticky', top: 0, zIndex: 2, minWidth: minW, whiteSpace: 'nowrap',
  };
}

function isNight(h) { const hour = parseInt(h.split(':')[0]); return hour >= 0 && hour <= 5; }

function getPeakHour(hourTotals) {
  let max = 0, peak = '—';
  for (const [h, v] of Object.entries(hourTotals)) { if (v > max) { max = v; peak = h; } }
  return peak;
}
