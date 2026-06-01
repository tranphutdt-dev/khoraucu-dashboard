// components/WorkerTable.js
// Sortable data table showing worker productivity details.

import { useState } from 'react';

// ── Sort icon ──────────────────────────────────────────────
function SortIcon({ direction }) {
  if (!direction) return <span style={{ opacity: 0.3, fontSize: '0.7rem' }}>⇅</span>;
  return <span style={{ fontSize: '0.7rem' }}>{direction === 'asc' ? '▲' : '▼'}</span>;
}

// ── Group badge ────────────────────────────────────────────
function GroupBadge({ nhom }) {
  if (!nhom) return null;
  const isHH = nhom.toUpperCase() === 'HUYHOANG';
  const isPST = nhom.toUpperCase() === 'PST';
  const isNVCT = nhom.toUpperCase() === 'NVCT';
  
  let bg = 'rgba(45,141,84,0.2)';
  let color = 'var(--green-light)';
  let border = 'rgba(45,141,84,0.35)';

  if (isHH || isPST) {
    bg = 'rgba(59, 130, 246, 0.2)'; /* glass blue */
    color = 'var(--blue-light)';
    border = 'rgba(59, 130, 246, 0.4)';
  } else if (isNVCT) {
    bg = 'rgba(245, 158, 11, 0.2)'; /* glass amber */
    color = 'var(--amber-light)';
    border = 'rgba(245, 158, 11, 0.4)';
  }

  return (
    <span style={{
      display: 'inline-block',
      fontSize: '0.67rem',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '100px',
      letterSpacing: '0.04em',
      background: bg,
      color: color,
      border: `1px solid ${border}`,
    }}>
      {nhom}
    </span>
  );
}

// ── Type badge ─────────────────────────────────────────────
function TypeBadge({ type }) {
  if (!type) return null;
  const isHub = type.toLowerCase().includes('hub');
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '0.67rem',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '100px',
      background: isHub ? 'rgba(147, 51, 234, 0.15)' : 'rgba(6, 182, 212, 0.15)',
      color: isHub ? 'var(--purple-light)' : 'var(--teal-light)',
      border: `1px solid ${isHub ? 'rgba(147, 51, 234, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
    }}>
      {type}
    </span>
  );
}

// ── Main table component ───────────────────────────────────
export default function WorkerTable({ data = [], tab = 'linker' }) {
  const [sortKey, setSortKey] = useState('tongKg');
  const [sortDir, setSortDir] = useState('desc');

  const showNhom   = tab === 'hub' || tab === 'linker';
  const showType   = tab === 'tongquan';

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    if (typeof va === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  // Calculate totals row
  const totalGram = data.reduce((s, r) => s + r.tongGram, 0);
  const totalKg   = data.reduce((s, r) => s + r.tongKg, 0);

  // Rank by kg for progress bar
  const maxKg = sorted[0]?.tongKg || 1;

  const thStyle = (key) => ({
    padding: '10px 12px',
    textAlign: key === 'tongGram' || key === 'tongKg' ? 'right' : 'left',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: sortKey === key ? 'var(--blue-light)' : 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(255, 255, 255, 0.03)',
    transition: 'color 0.15s ease',
  });

  if (!data.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', color: 'var(--text-muted)', gap: 8 }}>
        <span style={{ fontSize: '2rem' }}>📋</span>
        <span style={{ fontSize: '0.85rem' }}>Không có dữ liệu</span>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', animation: 'fadeIn 0.4s ease' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Outfit', sans-serif" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle('rank'), width: 44, textAlign: 'center' }}>#</th>
            <th style={thStyle('nguoi')} onClick={() => handleSort('nguoi')}>
              Nhân viên <SortIcon direction={sortKey === 'nguoi' ? sortDir : null} />
            </th>
            {showNhom && (
              <th style={thStyle('nhom')} onClick={() => handleSort('nhom')}>
                Nhóm <SortIcon direction={sortKey === 'nhom' ? sortDir : null} />
              </th>
            )}
            {showType && (
              <th style={thStyle('loaiKho')} onClick={() => handleSort('loaiKho')}>
                Loại kho <SortIcon direction={sortKey === 'loaiKho' ? sortDir : null} />
              </th>
            )}
            <th style={thStyle('tongGram')} onClick={() => handleSort('tongGram')}>
              Tổng gram <SortIcon direction={sortKey === 'tongGram' ? sortDir : null} />
            </th>
            <th style={thStyle('tongKg')} onClick={() => handleSort('tongKg')}>
              Tổng kg <SortIcon direction={sortKey === 'tongKg' ? sortDir : null} />
            </th>
            <th style={{ ...thStyle('bar'), cursor: 'default', width: 120 }}>Tỷ lệ</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => {
            const pct = Math.round((row.tongKg / maxKg) * 100);
            const isTop = idx === 0;
            return (
              <tr
                key={`${row.nguoi}-${idx}`}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s ease, transform 0.15s ease',
                  background: isTop ? 'rgba(147, 51, 234, 0.08)' : 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'scale(1.005)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isTop ? 'rgba(147, 51, 234, 0.08)' : 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Rank */}
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  {idx === 0 ? (
                    <span style={{ fontSize: '1rem' }}>🥇</span>
                  ) : idx === 1 ? (
                    <span style={{ fontSize: '1rem' }}>🥈</span>
                  ) : idx === 2 ? (
                    <span style={{ fontSize: '1rem' }}>🥉</span>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{idx + 1}</span>
                  )}
                </td>

                {/* Name */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: isTop ? 700 : 400, color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {row.nguoi}
                  </span>
                </td>

                {/* Nhóm (Hub only) */}
                {showNhom && (
                  <td style={{ padding: '9px 12px' }}>
                    <GroupBadge nhom={row.nhom} />
                  </td>
                )}

                {/* Loại kho (Tổng quan) */}
                {showType && (
                  <td style={{ padding: '9px 12px' }}>
                    <TypeBadge type={row.loaiKho} />
                  </td>
                )}

                {/* Gram */}
                <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {Number(row.tongGram).toLocaleString('vi-VN')}
                </td>

                {/* Kg */}
                <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {Number(row.tongKg).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                </td>

                {/* Progress bar */}
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      flex: 1,
                      height: 6,
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: (row.nhom === 'HUYHOANG' || row.nhom === 'PST')
                          ? 'var(--gradient-blue)'
                          : row.nhom === 'NVCT'
                            ? 'var(--gradient-amber)'
                            : row.loaiKho?.toLowerCase().includes('hub')
                              ? 'var(--gradient-purple)'
                              : 'var(--gradient-teal)',
                        borderRadius: 3,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        {/* Totals footer */}
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border-accent)', background: 'rgba(147, 51, 234, 0.08)' }}>
            <td colSpan={showNhom || showType ? 3 : 2} style={{ padding: '10px 12px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tổng cộng ({data.length} nhân viên)
            </td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {Number(totalGram).toLocaleString('vi-VN')}
            </td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 800, color: 'var(--blue-light)' }}>
              {Number(totalKg).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
