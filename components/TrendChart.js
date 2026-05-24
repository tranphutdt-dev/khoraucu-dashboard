// components/TrendChart.js
// Line chart showing 7-day productivity trend.
// Can show Hub, Linker, or combined total depending on selected tab.

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';

// ── Custom tooltip ─────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,24,38,0.97)',
      border: '1px solid var(--border-accent)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      fontFamily: "'Outfit', sans-serif",
      minWidth: 150,
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
        📅 {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
            {Number(p.value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Date formatter for axis ────────────────────────────────
function formatAxisDate(dateStr) {
  if (!dateStr) return '';
  // dateStr is ISO "YYYY-MM-DD"
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

// ── Main component ─────────────────────────────────────────
export default function TrendChart({ trendData = [], tab = 'linker' }) {
  if (!trendData.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--text-muted)', gap: 8 }}>
        <span style={{ fontSize: '2rem' }}>📈</span>
        <span style={{ fontSize: '0.85rem' }}>Chưa đủ dữ liệu xu hướng</span>
      </div>
    );
  }

  // Determine which lines to render
  const showHub    = tab === 'hub'    || tab === 'tongquan';
  const showLinker = tab === 'linker' || tab === 'tongquan';

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.6s ease' }}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={trendData} margin={{ top: 10, right: 16, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="gradHub" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3873B6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3873B6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradLinker" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2D8D54" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2D8D54" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: "'Outfit', sans-serif" }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickFormatter={formatAxisDate}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: "'Outfit', sans-serif" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toLocaleString('vi-VN')}kg`}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          {showHub && (
            <Area
              type="monotone"
              dataKey="hubKg"
              name="Hub"
              stroke="#3873B6"
              strokeWidth={2.5}
              fill="url(#gradHub)"
              dot={{ fill: '#3873B6', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#3873B6', stroke: '#fff', strokeWidth: 2 }}
            />
          )}
          {showLinker && (
            <Area
              type="monotone"
              dataKey="linkerKg"
              name="Linker"
              stroke="#2D8D54"
              strokeWidth={2.5}
              fill="url(#gradLinker)"
              dot={{ fill: '#2D8D54', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#2D8D54', stroke: '#fff', strokeWidth: 2 }}
            />
          )}
          {tab === 'tongquan' && (
            <Area
              type="monotone"
              dataKey="totalKg"
              name="Tổng"
              stroke="#5B9BD5"
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="5 3"
              dot={false}
            />
          )}
          {(showHub || showLinker) && (
            <Legend
              wrapperStyle={{
                fontSize: '0.75rem',
                fontFamily: "'Outfit', sans-serif",
                color: 'var(--text-secondary)',
                paddingTop: 8,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
