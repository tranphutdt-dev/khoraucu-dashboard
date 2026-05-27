// components/GroupSummaryTable.js
// Bảng tổng hợp năng suất theo nhóm cho kho Linker

export default function GroupSummaryTable({ groups = [] }) {
  if (!groups || groups.length === 0) return null;

  // Tính tổng để lấy tỷ lệ %
  const totalKg = groups.reduce((sum, g) => sum + g.tongKg, 0);

  // Sắp xếp nhóm theo khối lượng (từ cao đến thấp)
  const sortedGroups = [...groups].sort((a, b) => b.tongKg - a.tongKg);

  const thStyle = {
    padding: '10px 12px',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(0,0,0,0.2)',
  };

  return (
    <div style={{ overflowX: 'auto', marginBottom: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Outfit', sans-serif" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>Nhóm</th>
            <th style={thStyle}>Sĩ số</th>
            <th style={thStyle}>Tổng (kg)</th>
            <th style={thStyle}>Trung bình (kg/người)</th>
            <th style={thStyle}>Đóng góp</th>
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map((group, idx) => {
            const pct = totalKg > 0 ? (group.tongKg / totalKg) * 100 : 0;
            const avg = group.count > 0 ? group.tongKg / group.count : 0;

            return (
              <tr
                key={group.name}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 12px' }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '100px',
                    letterSpacing: '0.04em',
                    background: group.bg,
                    color: group.color,
                    border: `1px solid ${group.border}`,
                  }}>
                    {group.name}
                  </span>
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {group.count}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {Number(group.tongKg).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, color: 'var(--blue-light)' }}>
                  {Number(avg).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                </td>
                <td style={{ padding: '12px 12px', width: '25%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <div style={{
                      flex: 1,
                      height: 6,
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: 3,
                      overflow: 'hidden',
                      maxWidth: 100,
                    }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: group.barColor,
                        borderRadius: 3,
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 35, textAlign: 'right' }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
