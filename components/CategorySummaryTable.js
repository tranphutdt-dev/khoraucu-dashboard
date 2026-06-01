// components/CategorySummaryTable.js
// Bảng tổng hợp năng suất theo ngành hàng (chỉ dùng cho Tổng quan)

export default function CategorySummaryTable({ data = [] }) {
  if (!data || data.length === 0) return null;

  // Tính tổng để lấy tỷ lệ %
  const totalKg = data.reduce((sum, r) => sum + r.tongKg, 0);

  // Dữ liệu đã được group by ngành hàng (loaiKho = 'Ngành hàng')
  const sortedCategories = [...data].sort((a, b) => b.tongKg - a.tongKg);

  const thStyle = {
    padding: '10px 12px',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(255, 255, 255, 0.03)',
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>🛒</span>
          Năng suất theo nhóm ngành hàng
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Outfit', sans-serif" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'center', width: 44 }}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Ngành hàng</th>
              <th style={thStyle}>Tổng số gram</th>
              <th style={thStyle}>Tổng (kg)</th>
              <th style={thStyle}>Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((cat, idx) => {
              const pct = totalKg > 0 ? (cat.tongKg / totalKg) * 100 : 0;
              const isTop = idx < 3;

              return (
                <tr
                  key={cat.nguoi}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s ease, transform 0.15s ease',
                    background: isTop ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.transform = 'scale(1.005)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isTop ? 'rgba(59, 130, 246, 0.08)' : 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{idx + 1}</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 12px', fontWeight: isTop ? 700 : 500, color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {cat.nguoi}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {Number(cat.tongGram).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {Number(cat.tongKg).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                  </td>
                  <td style={{ padding: '9px 12px', width: '25%' }}>
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
                          background: 'var(--gradient-blue)',
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
    </div>
  );
}
