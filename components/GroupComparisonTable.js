import styles from '../styles/Dashboard.module.css';

export default function GroupComparisonTable({ data, numDays = 1 }) {
  if (!data || data.length === 0) return null;

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
    <div className={styles.card} style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>👥</span>
          So sánh năng suất theo Nhóm nhân sự
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Outfit', sans-serif" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }}>Nhóm</th>
              <th style={thStyle}>Số nhân sự</th>
              <th style={thStyle}>Tổng Kg</th>
              <th style={thStyle}>Tổng Drop</th>
              <th style={thStyle}>TB Kg / Người / Ngày</th>
              <th style={thStyle}>TB Drop / Người / Ngày</th>
              <th style={thStyle}>TB Drop / Người / Giờ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const avgKg = row.count > 0 ? (row.tongKg / row.count / numDays) : 0;
              const avgDrop = row.count > 0 ? (row.tongDrop / row.count / numDays) : 0;
              const avgDropPerHour = row.activeHours > 0 ? (row.tongDrop / row.activeHours) : 0;

              return (
                <tr
                  key={row.nhom}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {row.nhom}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {row.count}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: 'var(--green-light)' }}>
                    {Number(row.tongKg).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: '#F38144' }}>
                    {Number(row.tongDrop).toLocaleString('vi-VN')} lượt
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 700, color: 'var(--green)' }}>
                    {Number(avgKg).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 700, color: '#F38144' }}>
                    {Number(avgDrop).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 700, color: 'var(--amber)' }}>
                    {Number(avgDropPerHour).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
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
