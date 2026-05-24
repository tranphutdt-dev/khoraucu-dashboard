// components/KPICard.js
// Animated KPI metric card with icon, value, subtitle, and optional trend indicator.

import { useEffect, useRef, useState } from 'react';

// ── Animated number counter hook ──────────────────────────
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined || isNaN(target)) {
      setValue(target);
      return;
    }
    const start = Date.now();
    const from  = 0;
    const step  = () => {
      const elapsed  = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ── Trend badge ────────────────────────────────────────────
function TrendBadge({ value }) {
  if (value === null || value === undefined) return null;
  const isPos = value >= 0;
  const abs   = Math.abs(value).toFixed(1);

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontSize: '0.72rem',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '100px',
      background: isPos ? 'rgba(45,141,84,0.18)' : 'rgba(192,57,43,0.18)',
      color: isPos ? 'var(--green-light)' : '#E74C3C',
      border: `1px solid ${isPos ? 'rgba(45,141,84,0.3)' : 'rgba(192,57,43,0.3)'}`,
    }}>
      {isPos ? '▲' : '▼'} {abs}%
    </span>
  );
}

// ── KPICard component ──────────────────────────────────────
export default function KPICard({
  icon,
  label,
  value,
  unit = '',
  subtitle,
  trend,        // percentage change vs yesterday (number or null)
  accentColor = 'var(--blue)',
  delay = 0,
}) {
  const animatedVal = useCountUp(typeof value === 'number' ? value : 0, 900);
  const displayVal  = typeof value === 'number'
    ? animatedVal.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
    : (value ?? '—');

  return (
    <div style={{
      background: 'var(--gradient-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      padding: '1.1rem 1.25rem',
      position: 'relative',
      overflow: 'hidden',
      animation: `fadeInUp 0.45s ease ${delay}ms both`,
      transition: 'box-shadow 0.25s ease, border-color 0.25s ease, transform 0.2s ease',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
      e.currentTarget.style.borderColor = 'var(--border-accent)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      e.currentTarget.style.borderColor = 'var(--border-subtle)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      {/* Accent glow top-left corner */}
      <div style={{
        position: 'absolute',
        top: -20,
        left: -20,
        width: 80,
        height: 80,
        background: accentColor,
        borderRadius: '50%',
        opacity: 0.07,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      {/* Top row: icon + trend badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          background: `${accentColor}22`,
          border: `1px solid ${accentColor}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
        }}>
          {icon}
        </div>
        <TrendBadge value={trend} />
      </div>

      {/* Value */}
      <div style={{
        fontSize: '2rem',
        fontWeight: 800,
        color: 'var(--text-primary)',
        lineHeight: 1,
        marginBottom: '4px',
        fontFamily: "'Outfit', sans-serif",
        letterSpacing: '-0.02em',
      }}>
        {displayVal}
        {unit && (
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 4 }}>
            {unit}
          </span>
        )}
      </div>

      {/* Label */}
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
        {label}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
          {subtitle}
        </div>
      )}

      {/* Bottom accent bar */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${accentColor}, transparent)`,
        opacity: 0.6,
      }} />
    </div>
  );
}
