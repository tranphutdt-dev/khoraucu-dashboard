// components/TabSwitcher.js
// Animated tab switcher for Linker / Hub / Tổng quan

export default function TabSwitcher({ tabs, activeTab, onTabChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '10px',
      padding: '4px',
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              border: 'none',
              borderRadius: '7px',
              fontSize: '0.82rem',
              fontWeight: isActive ? 700 : 500,
              fontFamily: "'Outfit', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isActive
                ? tab.activeGradient || 'var(--gradient-blue)'
                : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              boxShadow: isActive
                ? `0 2px 12px ${tab.shadowColor || 'rgba(56,115,182,0.35)'}`
                : 'none',
              transform: isActive ? 'none' : 'none',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <span style={{ fontSize: '0.95rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
