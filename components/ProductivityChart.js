// components/ProductivityChart.js
// Horizontal/vertical bar chart showing kg productivity per worker for selected day.
// Uses Recharts. Supports coloring by group (HUYHOANG vs Others) for Hub tab.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';

// ── Custom tooltip ─────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--glass-border)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: 'var(--shadow-card)',
      fontFamily: "'Outfit', sans-serif",
      minWidth: 160,
    }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
        👤 {label}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
        {Number(d.value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>kg</span>
      </div>
      {d.payload?.tongGram > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          {Number(d.payload.tongGram).toLocaleString('vi-VN')} gr
        </div>
      )}
      {d.payload?.nhom && (
        <div style={{
          marginTop: 6,
          fontSize: '0.7rem',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '100px',
          display: 'inline-block',
          background: (d.payload.nhom === 'HUYHOANG' || d.payload.nhom === 'PST') 
            ? 'rgba(59, 130, 246, 0.25)' 
            : d.payload.nhom === 'NVCT'
              ? 'rgba(245, 158, 11, 0.25)'
              : 'rgba(147, 51, 234, 0.25)',
          color: (d.payload.nhom === 'HUYHOANG' || d.payload.nhom === 'PST')
            ? 'var(--blue-light)'
            : d.payload.nhom === 'NVCT'
              ? 'var(--amber-light)'
              : 'var(--purple-light)',
        }}>
          {d.payload.nhom}
        </div>
      )}
    </div>
  );
}

// ── Custom Y-axis tick (worker names) ──────────────────────
function WorkerTick({ x, y, payload }) {
  const name = payload.value || '';
  // Truncate long names
  const display = name.length > 16 ? name.slice(0, 15) + '…' : name;
  return (
    <text x={x} y={y} dy={4} fill="var(--text-secondary)" fontSize={11} textAnchor="end" fontFamily="'Outfit', sans-serif">
      {display}
    </text>
  );
}

// ── Colour resolver ────────────────────────────────────────
function getBarColor(entry, tab) {
  if (tab === 'hub') {
    return entry.nhom === 'HUYHOANG' ? '#9333EA' : '#10B981'; // Purple / Green
  }
  if (tab === 'linker') {
    if (entry.nhom === 'PST') return '#3B82F6'; // Blue
    if (entry.nhom === 'NVCT') return '#F59E0B'; // Amber
    if (entry.nhom === 'Green Human') return '#10B981'; // Green
    return '#06B6D4'; // Cyan
  }
  // Tổng quan: colour by type
  return entry.loaiKho?.toLowerCase().includes('hub') ? '#9333EA' : '#06B6D4'; // Purple / Cyan
}

// ── Main component ─────────────────────────────────────────
export default function ProductivityChart({ data = [], tab = 'linker', title }) {
  if (!data.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', gap: 8 }}>
        <span style={{ fontSize: '2rem' }}>📭</span>
        <span style={{ fontSize: '0.85rem' }}>Không có dữ liệu cho ngày này</span>
      </div>
    );
  }

  // Sort descending by kg
  const sorted = [...data].sort((a, b) => b.tongKg - a.tongKg);
  const barHeight = 36;
  const minHeight = 200;
  const chartHeight = Math.max(minHeight, sorted.length * barHeight + 40);

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.5s ease' }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 8, right: 60, bottom: 8, left: 110 }}
          barCategoryGap="25%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: "'Outfit', sans-serif" }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickFormatter={(v) => v.toLocaleString('vi-VN')}
            unit=" kg"
          />
          <YAxis
            type="category"
            dataKey="nguoi"
            tick={<WorkerTick />}
            tickLine={false}
            axisLine={false}
            width={108}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar
            dataKey="tongKg"
            radius={[0, 5, 5, 0]}
            maxBarSize={24}
          >
            {sorted.map((entry, idx) => (
              <Cell key={idx} fill={getBarColor(entry, tab)} fillOpacity={0.85} />
            ))}
            <LabelList
              dataKey="tongKg"
              position="right"
              formatter={(v) => `${Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg`}
              style={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: "'Outfit', sans-serif" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
