// pages/index.js
// Main supply-chain productivity dashboard for Kho Rau Củ – HCM010002.
// Fetches data from /api/data, provides date picking, tab switching,
// KPI cards, bar chart, trend line chart, and a sortable worker table.

import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';

import KPICard          from '../components/KPICard';
import TabSwitcher      from '../components/TabSwitcher';
import ProductivityChart from '../components/ProductivityChart';
import TrendChart       from '../components/TrendChart';
import WorkerTable      from '../components/WorkerTable';

import styles from '../styles/Dashboard.module.css';

// ── Tab definitions ────────────────────────────────────────
const TABS = [
  {
    id: 'linker',
    label: 'Linker',
    icon: '🔗',
    activeGradient: 'linear-gradient(135deg, #144F5A, #217887)',
    shadowColor: 'rgba(33,120,135,0.4)',
  },
  {
    id: 'hub',
    label: 'Hub',
    icon: '🏭',
    activeGradient: 'linear-gradient(135deg, #1B3A6B, #3873B6)',
    shadowColor: 'rgba(56,115,182,0.4)',
  },
  {
    id: 'tongquan',
    label: 'Tổng quan',
    icon: '📊',
    activeGradient: 'linear-gradient(135deg, #2D3A50, #4A6A8A)',
    shadowColor: 'rgba(90,130,160,0.4)',
  },
];

// ── Date helpers ───────────────────────────────────────────
// Format ISO date "YYYY-MM-DD" → "DD/MM/YYYY" for display
function fmtDisplay(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Format ISO → input[type=date] value string (YYYY-MM-DD)
function toInputVal(iso) {
  return iso || '';
}

// Get previous ISO date
function prevDay(iso) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Data filters ───────────────────────────────────────────
function filterByTab(rows, tab) {
  if (tab === 'linker')   return rows.filter(r => r.loaiKho?.toLowerCase().includes('linker'));
  if (tab === 'hub')      return rows.filter(r => r.loaiKho?.toLowerCase().includes('hub'));
  return rows; // tongquan = all
}

// ── Trend aggregation (last 7 days) ───────────────────────
function buildTrendData(rows, selectedDate, tab) {
  // Collect all unique dates ≤ selectedDate, up to 7
  const allDates = [...new Set(rows.map(r => r.date))]
    .filter(Boolean)
    .sort()
    .filter(d => d <= selectedDate)
    .slice(-7);

  return allDates.map(date => {
    const dayRows  = rows.filter(r => r.date === date);
    const hubRows  = dayRows.filter(r => r.loaiKho?.toLowerCase().includes('hub'));
    const lnkRows  = dayRows.filter(r => r.loaiKho?.toLowerCase().includes('linker'));
    const hubKg    = hubRows.reduce((s, r) => s + r.tongKg, 0);
    const linkerKg = lnkRows.reduce((s, r) => s + r.tongKg, 0);
    const totalKg  = dayRows.reduce((s, r) => s + r.tongKg, 0);
    return { date, hubKg, linkerKg, totalKg };
  });
}

// ── KPI computation ────────────────────────────────────────
function computeKPIs(todayRows, yesterdayRows, tab) {
  const tRows = filterByTab(todayRows, tab);
  const yRows = filterByTab(yesterdayRows, tab);

  const totalKg  = tRows.reduce((s, r) => s + r.tongKg, 0);
  const yTotalKg = yRows.reduce((s, r) => s + r.tongKg, 0);
  const trend    = yTotalKg > 0 ? ((totalKg - yTotalKg) / yTotalKg) * 100 : null;

  // Top performer by kg
  const top = tRows.reduce((best, r) => (!best || r.tongKg > best.tongKg) ? r : best, null);

  return {
    totalKg,
    workerCount: tRows.length,
    top,
    trend,
    yTotalKg,
  };
}

// ── Main page ──────────────────────────────────────────────
export default function Dashboard() {
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [sheetMissing, setSheetMissing] = useState(false);
  const [activeTab,    setActiveTab]    = useState('linker');
  const [selectedDate, setSelectedDate] = useState(null); // ISO string
  const [allDates,     setAllDates]     = useState([]);
  const [lastRefresh,  setLastRefresh]  = useState(null);

  // ── Fetch data ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/data');
      const json = await res.json();

      if (json.error === 'SHEET_ID_MISSING') {
        setSheetMissing(true);
        setRows([]);
        setLoading(false);
        return;
      }

      if (!res.ok || json.error) {
        throw new Error(json.message || 'Lỗi tải dữ liệu');
      }

      setSheetMissing(false);
      const fetchedRows = json.rows || [];
      setRows(fetchedRows);

      // Compute available dates
      const dates = [...new Set(fetchedRows.map(r => r.date).filter(Boolean))].sort();
      setAllDates(dates);

      // Default to the latest date available
      if (dates.length > 0) {
        setSelectedDate(prev => prev && dates.includes(prev) ? prev : dates[dates.length - 1]);
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived data ─────────────────────────────────────────
  const todayRows     = useMemo(() => rows.filter(r => r.date === selectedDate), [rows, selectedDate]);
  const yesterdayDate = useMemo(() => selectedDate ? prevDay(selectedDate) : null, [selectedDate]);
  const yesterdayRows = useMemo(() => rows.filter(r => r.date === yesterdayDate), [rows, yesterdayDate]);

  const filteredRows  = useMemo(() => filterByTab(todayRows, activeTab), [todayRows, activeTab]);
  const trendData     = useMemo(() => buildTrendData(rows, selectedDate || '', activeTab), [rows, selectedDate, activeTab]);
  const kpis          = useMemo(() => computeKPIs(todayRows, yesterdayRows, activeTab), [todayRows, yesterdayRows, activeTab]);

  // Hub groups breakdown (for Hub tab legend)
  const hubHH     = useMemo(() => filteredRows.filter(r => r.nhom?.toUpperCase() === 'HUYHOANG'), [filteredRows]);
  const hubOthers = useMemo(() => filteredRows.filter(r => r.nhom?.toUpperCase() !== 'HUYHOANG' && r.nhom), [filteredRows]);

  // ── Handlers ─────────────────────────────────────────────
  function handleDateChange(e) {
    const val = e.target.value; // "YYYY-MM-DD"
    if (val) setSelectedDate(val);
  }

  // ── Render: Loading ──────────────────────────────────────
  if (loading) {
    return (
      <>
        <Head><title>Kho Rau Củ – Dashboard</title></Head>
        <div className={styles.page}>
          <Header />
          <div className={styles.main}>
            <div className={styles.loadingState}>
              <div className="spinner" />
              <p className={styles.loadingText}>Đang tải dữ liệu từ Google Sheets…</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Render: Error ────────────────────────────────────────
  if (error) {
    return (
      <>
        <Head><title>Kho Rau Củ – Dashboard</title></Head>
        <div className={styles.page}>
          <Header />
          <div className={styles.main}>
            <div className={styles.errorState}>
              <span className={styles.errorIcon}>⚠️</span>
              <h2 className={styles.errorTitle}>Không thể tải dữ liệu</h2>
              <p className={styles.errorMsg}>{error}</p>
              <button className={styles.errorRetry} onClick={fetchData}>Thử lại</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main render ──────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Kho Rau Củ – Báo Cáo Năng Suất</title>
        <meta name="description" content="Dashboard năng suất kho lạnh Kho Rau Củ HCM010002" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥬</text></svg>" />
      </Head>

      <div className={styles.page}>
        {/* ── Header ── */}
        <Header lastRefresh={lastRefresh} />

        {/* ── Main ── */}
        <main className={styles.main}>

          {/* No Sheet ID warning */}
          {sheetMissing && (
            <div className={styles.sheetWarning}>
              <span className={styles.sheetWarningIcon}>⚙️</span>
              <div className={styles.sheetWarningText}>
                <h3>Chưa cấu hình Google Sheet ID</h3>
                <p>
                  Hãy mở tệp <code>dashboard/.env.local</code> và điền giá trị{' '}
                  <code>NEXT_PUBLIC_DASHBOARD_SHEET_ID=&lt;sheet-id&gt;</code>, sau đó khởi động lại server.
                  Sheet ID là chuỗi ký tự trong URL Google Sheets của bạn.
                </p>
              </div>
            </div>
          )}

          {/* ── Controls bar ── */}
          <div className={styles.controlsBar}>
            <div className={styles.datePickerGroup}>
              <span className={styles.dateLabel}>📅 Ngày báo cáo:</span>
              <input
                type="date"
                value={toInputVal(selectedDate)}
                onChange={handleDateChange}
                min={allDates[0] || ''}
                max={allDates[allDates.length - 1] || ''}
                className={styles.dateInput}
              />
              {selectedDate && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  ({fmtDisplay(selectedDate)})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <TabSwitcher tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
              <button className={styles.refreshBtn} onClick={fetchData} title="Làm mới dữ liệu">
                🔄 Làm mới
              </button>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className={styles.kpiGrid}>
            <KPICard
              icon="⚖️"
              label="Tổng kg hôm nay"
              value={kpis.totalKg}
              unit="kg"
              subtitle={`So với hôm qua: ${kpis.yTotalKg > 0 ? kpis.yTotalKg.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' kg' : 'Không có dữ liệu'}`}
              trend={kpis.trend}
              accentColor="var(--blue)"
              delay={0}
            />
            <KPICard
              icon="🏆"
              label="Nhân viên xuất sắc"
              value={kpis.top?.nguoi ?? '—'}
              unit=""
              subtitle={kpis.top ? `${Number(kpis.top.tongKg).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg${kpis.top.nhom ? ' · ' + kpis.top.nhom : ''}` : 'Chưa có dữ liệu'}
              accentColor="var(--amber)"
              delay={80}
            />
            <KPICard
              icon="👥"
              label="Số nhân viên"
              value={kpis.workerCount}
              unit="người"
              subtitle={activeTab === 'hub'
                ? `HUYHOANG: ${hubHH.length} · Khác: ${hubOthers.length}`
                : activeTab === 'linker'
                  ? 'Ca làm việc hôm nay'
                  : `Hub: ${todayRows.filter(r=>r.loaiKho?.toLowerCase().includes('hub')).length} · Linker: ${todayRows.filter(r=>r.loaiKho?.toLowerCase().includes('linker')).length}`}
              accentColor="var(--teal)"
              delay={160}
            />
            <KPICard
              icon="📈"
              label="Năng suất TB / người"
              value={kpis.workerCount > 0 ? +(kpis.totalKg / kpis.workerCount).toFixed(2) : 0}
              unit="kg"
              subtitle={`Ngày ${fmtDisplay(selectedDate)}`}
              accentColor="var(--green)"
              delay={240}
            />
          </div>

          {/* ── Charts row ── */}
          <div className={styles.chartsRow}>
            {/* Productivity bar chart */}
            <div className={styles.card} style={{ animationDelay: '0.15s' }}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>
                  <span className={styles.cardIcon}>📊</span>
                  Năng suất theo nhân viên
                </span>
                <span className={`${styles.cardBadge} ${activeTab === 'linker' ? styles.cardBadgeTeal : activeTab === 'hub' ? styles.cardBadgeBlue : styles.cardBadgeGreen}`}>
                  {fmtDisplay(selectedDate)}
                </span>
              </div>

              {/* Group legend for Hub tab */}
              {activeTab === 'hub' && filteredRows.length > 0 && (
                <div className={styles.legendRow}>
                  <div className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: '#3873B6' }} />
                    <span>HUYHOANG ({hubHH.length} người)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: '#2D8D54' }} />
                    <span>Others ({hubOthers.length} người)</span>
                  </div>
                </div>
              )}

              <div className={styles.cardBody}>
                <ProductivityChart data={filteredRows} tab={activeTab} />
              </div>
            </div>

            {/* 7-day trend chart */}
            <div className={styles.card} style={{ animationDelay: '0.25s' }}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>
                  <span className={styles.cardIcon}>📉</span>
                  Xu hướng 7 ngày
                </span>
                <span className={`${styles.cardBadge} ${styles.cardBadgeBlue}`}>
                  {trendData.length} ngày
                </span>
              </div>
              <div className={styles.cardBody}>
                <TrendChart trendData={trendData} tab={activeTab} />
              </div>
            </div>
          </div>

          {/* ── Worker table ── */}
          <div className={styles.card} style={{ animationDelay: '0.35s' }}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className={styles.cardIcon}>📋</span>
                Chi tiết nhân viên
                {filteredRows.length > 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                    ({filteredRows.length} bản ghi)
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeTab === 'hub' && (
                  <>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      HH: <strong style={{ color: 'var(--blue-light)' }}>{hubHH.reduce((s,r)=>s+r.tongKg,0).toLocaleString('vi-VN',{maximumFractionDigits:1})} kg</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Khác: <strong style={{ color: 'var(--green-light)' }}>{hubOthers.reduce((s,r)=>s+r.tongKg,0).toLocaleString('vi-VN',{maximumFractionDigits:1})} kg</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
            <WorkerTable data={filteredRows} tab={activeTab} />
          </div>

          {/* ── Footer ── */}
          <footer style={{
            marginTop: '2rem',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            paddingBottom: '1rem',
          }}>
            Kho Rau Củ · HCM010002 · Dữ liệu từ Google Sheets
            {lastRefresh && ` · Cập nhật lúc ${lastRefresh.toLocaleTimeString('vi-VN')}`}
          </footer>
        </main>
      </div>
    </>
  );
}

// ── Header sub-component ───────────────────────────────────
function Header({ lastRefresh }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerLeft}>
          <div className={styles.logoMark}>🥬</div>
          <div className={styles.headerText}>
            <h1>Kho Rau Củ — Dashboard Năng Suất</h1>
            <p>Báo cáo năng suất phân loại hàng ngày · Supply Chain Intelligence</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerBadge}>
            <span className={styles.liveIndicator} />
            Đang hoạt động
          </div>
          <div className={styles.hubId}>HCM010002</div>
          {lastRefresh && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
              {lastRefresh.toLocaleTimeString('vi-VN')}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
