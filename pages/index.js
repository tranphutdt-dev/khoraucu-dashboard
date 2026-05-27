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
import GroupSummaryTable from '../components/GroupSummaryTable';
import CategorySummaryTable from '../components/CategorySummaryTable';
import GroupComparisonTable from '../components/GroupComparisonTable';
import HourlyHeatmap    from '../components/HourlyHeatmap';

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

function getDaysDiff(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Data filters & grouping ───────────────────────────────────────────
function filterByTab(rows, tab) {
  if (tab === 'linker')   return rows.filter(r => r.loaiKho?.toLowerCase().includes('linker'));
  if (tab === 'hub')      return rows.filter(r => r.loaiKho?.toLowerCase().includes('hub'));
  return rows; // tongquan = all
}

function groupRowsByWorker(rows) {
  const map = new Map();
  rows.forEach(r => {
    const key = r.nguoi;
    if (!map.has(key)) {
      map.set(key, { ...r });
    } else {
      const existing = map.get(key);
      existing.tongKg += r.tongKg;
      existing.tongGram = (existing.tongGram || 0) + (r.tongGram || 0);
    }
  });
  return Array.from(map.values());
}

// ── Trend aggregation (last 7 days) ───────────────────────
function buildTrendData(rows, startDate, endDate, tab) {
  // Collect all unique dates within range
  const allDates = [...new Set(rows.map(r => r.date))]
    .filter(Boolean)
    .sort()
    .filter(d => d >= startDate && d <= endDate);

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
function computeKPIs(rangeRowsGrouped, prevRangeRowsGrouped) {
  const totalKg  = rangeRowsGrouped.reduce((s, r) => s + r.tongKg, 0);
  const yTotalKg = prevRangeRowsGrouped.reduce((s, r) => s + r.tongKg, 0);
  const trend    = yTotalKg > 0 ? ((totalKg - yTotalKg) / yTotalKg) * 100 : null;

  // Top performer by kg
  const top = rangeRowsGrouped.reduce((best, r) => (!best || r.tongKg > best.tongKg) ? r : best, null);

  return {
    totalKg,
    workerCount: rangeRowsGrouped.length,
    top,
    trend,
    yTotalKg,
  };
}

// ── Main page ──────────────────────────────────────────────
export default function Dashboard() {
  const [rows,         setRows]         = useState([]);
  const [hourlyRows,   setHourlyRows]   = useState([]);
  const [dropHourlyRows, setDropHourlyRows] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [sheetMissing, setSheetMissing] = useState(false);
  const [activeTab,    setActiveTab]    = useState('linker');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [allDates,     setAllDates]     = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
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
      
      const allRows = json.rows || [];
      const dataRows = allRows.filter(r => r.loaiKho !== 'Ngành hàng');
      const catRows = allRows.filter(r => r.loaiKho === 'Ngành hàng');
      
      setRows(dataRows);
      setCategoryRows(catRows);
      setHourlyRows(json.hourlyRows || []);
      setDropHourlyRows(json.dropHourlyRows || []);

      // Compute available dates
      const dates = [...new Set(dataRows.map(r => r.date).filter(Boolean))].sort();
      setAllDates(dates);

      // Default to the latest date available for both start and end
      if (dates.length > 0) {
        const latest = dates[dates.length - 1];
        setStartDate(prev => prev && dates.includes(prev) ? prev : latest);
        setEndDate(prev => prev && dates.includes(prev) ? prev : latest);
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
  const rangeRows = useMemo(() => {
    if (!startDate || !endDate) return rows;
    return rows.filter(r => r.date >= startDate && r.date <= endDate);
  }, [rows, startDate, endDate]);

  const rangeCatRows = useMemo(() => {
    if (!startDate || !endDate) return categoryRows;
    return categoryRows.filter(r => r.date >= startDate && r.date <= endDate);
  }, [categoryRows, startDate, endDate]);

  const filteredRangeRows = useMemo(() => filterByTab(rangeRows, activeTab), [rangeRows, activeTab]);
  const groupedRows = useMemo(() => groupRowsByWorker(filteredRangeRows), [filteredRangeRows]);

  const prevRangeRows = useMemo(() => {
    if (!startDate || !endDate) return [];
    const diff = getDaysDiff(startDate, endDate) + 1;
    const prevEnd = shiftDate(startDate, -1);
    const prevStart = shiftDate(prevEnd, -(diff - 1));
    return rows.filter(r => r.date >= prevStart && r.date <= prevEnd);
  }, [rows, startDate, endDate]);
  const filteredPrevRangeRows = useMemo(() => filterByTab(prevRangeRows, activeTab), [prevRangeRows, activeTab]);
  const prevGroupedRows = useMemo(() => groupRowsByWorker(filteredPrevRangeRows), [filteredPrevRangeRows]);

  const numDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    return getDaysDiff(startDate, endDate) + 1;
  }, [startDate, endDate]);

  const rangeDropRows = useMemo(() => {
    if (!startDate || !endDate) return dropHourlyRows;
    return dropHourlyRows.filter(r => r.date >= startDate && r.date <= endDate);
  }, [dropHourlyRows, startDate, endDate]);

  const filteredRangeDropRows = useMemo(() => {
    // Collect allowed workers from groupedRows (which is already filtered by tab)
    const allowedWorkers = new Set(groupedRows.map(r => r.nguoi));
    return rangeDropRows.filter(r => allowedWorkers.has(r.nguoi));
  }, [rangeDropRows, groupedRows]);

  const dropStats = useMemo(() => {
    let totalDrop = 0;
    let activeHours = 0;
    filteredRangeDropRows.forEach(r => {
      totalDrop += (r.tongDrop || 0);
      if (r.hours) {
        Object.values(r.hours).forEach(v => {
          if (v > 0) activeHours++;
        });
      }
    });
    return { totalDrop, activeHours };
  }, [filteredRangeDropRows]);

  const { totalDrop, activeHours } = dropStats;

  const trendData = useMemo(() => buildTrendData(rows, startDate || '', endDate || '', activeTab), [rows, startDate, endDate, activeTab]);
  const kpis = useMemo(() => computeKPIs(groupedRows, prevGroupedRows), [groupedRows, prevGroupedRows]);

  // Hub groups breakdown (for Hub tab legend)
  const hubHH = useMemo(() => groupedRows.filter(r => r.nhom?.toUpperCase() === 'HUYHOANG'), [groupedRows]);
  const hubOthers = useMemo(() => groupedRows.filter(r => r.nhom?.toUpperCase() !== 'HUYHOANG' && r.nhom), [groupedRows]);

  const linkerPST = useMemo(() => groupedRows.filter(r => r.nhom?.toUpperCase() === 'PST'), [groupedRows]);
  const linkerNVCT = useMemo(() => groupedRows.filter(r => r.nhom?.toUpperCase() === 'NVCT'), [groupedRows]);
  const linkerGH = useMemo(() => groupedRows.filter(r => r.nhom?.toUpperCase() === 'GREEN HUMAN'), [groupedRows]);

  const linkerGroupsData = useMemo(() => {
    if (activeTab !== 'linker' || groupedRows.length === 0) return [];
    return [
      {
        name: 'PST',
        count: linkerPST.length,
        tongKg: linkerPST.reduce((s, r) => s + r.tongKg, 0),
        bg: 'rgba(56,115,182,0.2)',
        color: 'var(--blue-light)',
        border: 'rgba(56,115,182,0.35)',
        barColor: 'var(--gradient-blue)',
      },
      {
        name: 'NVCT',
        count: linkerNVCT.length,
        tongKg: linkerNVCT.reduce((s, r) => s + r.tongKg, 0),
        bg: 'rgba(212,86,12,0.2)',
        color: '#F38144',
        border: 'rgba(212,86,12,0.35)',
        barColor: 'linear-gradient(90deg, #D4560C 0%, #F38144 100%)',
      },
      {
        name: 'Green Human',
        count: linkerGH.length,
        tongKg: linkerGH.reduce((s, r) => s + r.tongKg, 0),
        bg: 'rgba(45,141,84,0.2)',
        color: 'var(--green-light)',
        border: 'rgba(45,141,84,0.35)',
        barColor: 'var(--gradient-green)',
      }
    ];
  }, [activeTab, groupedRows, linkerPST, linkerNVCT, linkerGH]);

  const tongQuanGroupStats = useMemo(() => {
    if (activeTab !== 'tongquan' || groupedRows.length === 0) return [];
    
    // Create a map of worker -> { totalDrop, activeHours }
    const dropMap = new Map();
    filteredRangeDropRows.forEach(r => {
      let activeHrs = 0;
      if (r.hours) {
        Object.values(r.hours).forEach(val => {
          if (val > 0) activeHrs += 1;
        });
      }
      
      if (!dropMap.has(r.nguoi)) {
        dropMap.set(r.nguoi, { tongDrop: 0, activeHours: 0 });
      }
      const dm = dropMap.get(r.nguoi);
      dm.tongDrop += (r.tongDrop || 0);
      dm.activeHours += activeHrs;
    });

    const map = new Map();
    groupedRows.forEach(r => {
      const nhom = r.nhom || 'Khác';
      if (!map.has(nhom)) {
        map.set(nhom, { nhom, count: 0, tongKg: 0, tongDrop: 0, activeHours: 0 });
      }
      const existing = map.get(nhom);
      existing.count += 1;
      existing.tongKg += r.tongKg;
      if (dropMap.has(r.nguoi)) {
        existing.tongDrop += dropMap.get(r.nguoi).tongDrop;
        existing.activeHours += dropMap.get(r.nguoi).activeHours;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.tongKg - a.tongKg);
  }, [activeTab, groupedRows, filteredRangeDropRows]);

  const catDataGrouped = useMemo(() => {
    const map = new Map();
    rangeCatRows.forEach(r => {
      const key = r.nguoi;
      if (!map.has(key)) {
        map.set(key, { ...r });
      } else {
        const existing = map.get(key);
        existing.tongKg += r.tongKg;
        existing.tongGram = (existing.tongGram || 0) + (r.tongGram || 0);
      }
    });
    return Array.from(map.values());
  }, [rangeCatRows]);

  // ── Handlers ─────────────────────────────────────────────
  function handleStartDateChange(e) { if (e.target.value) setStartDate(e.target.value); }
  function handleEndDateChange(e) { if (e.target.value) setEndDate(e.target.value); }

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
                  <code>DASHBOARD_SHEET_ID=&lt;sheet-id&gt;</code>, sau đó khởi động lại server.
                  Sheet ID là chuỗi ký tự trong URL Google Sheets của bạn.
                </p>
              </div>
            </div>
          )}

          {/* ── Controls bar ── */}
          <div className={styles.controlsBar}>
          <div className={styles.datePickerGroup}>
              <span className={styles.dateLabel}>📅 Lọc dữ liệu:</span>

              {/* Start date — only dates with data */}
              <select
                value={startDate || ''}
                onChange={e => {
                  const val = e.target.value;
                  setStartDate(val);
                  if (endDate && endDate < val) setEndDate(val);
                }}
                className={styles.dateInput}
                title="Chọn ngày bắt đầu"
              >
                {allDates.map(d => (
                  <option key={d} value={d} style={{ background: '#0F1923' }}>
                    {fmtDisplay(d)}
                  </option>
                ))}
              </select>

              <span className={styles.dateSeparator}>—</span>

              {/* End date — only dates >= startDate */}
              <select
                value={endDate || ''}
                onChange={e => setEndDate(e.target.value)}
                className={styles.dateInput}
                title="Chọn ngày kết thúc"
              >
                {allDates.filter(d => !startDate || d >= startDate).map(d => (
                  <option key={d} value={d} style={{ background: '#0F1923' }}>
                    {fmtDisplay(d)}
                  </option>
                ))}
              </select>

              {/* Available dates badge */}
              {allDates.length > 0 && (
                <span style={{
                  fontSize: '0.7rem', color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px', padding: '0.2rem 0.5rem',
                  whiteSpace: 'nowrap',
                }}>
                  {allDates.length} ngày
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
              subtitle={`So với g.đoạn trước: ${kpis.yTotalKg > 0 ? kpis.yTotalKg.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' kg' : 'Không có dữ liệu'}`}
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
                  ? `PST: ${linkerPST.length} · NVCT: ${linkerNVCT.length} · GH: ${linkerGH.length}`
                  : `Nhân viên làm việc trong giai đoạn này`}
              accentColor="var(--teal)"
              delay={160}
            />
            <KPICard
              icon="📈"
              label="Năng suất TB/Người/Ngày"
              value={kpis.workerCount > 0 && numDays > 0 ? +(kpis.totalKg / kpis.workerCount / numDays).toFixed(2) : 0}
              unit="kg/ngày"
              subtitle={`Giai đoạn: ${fmtDisplay(startDate)} - ${fmtDisplay(endDate)}`}
              accentColor="var(--green)"
              delay={240}
            />
            <KPICard
              icon="⚡"
              label="Drop TB/Người/Ngày"
              value={kpis.workerCount > 0 && numDays > 0 ? +(totalDrop / kpis.workerCount / numDays).toFixed(2) : 0}
              unit="lượt/ngày"
              subtitle={`Tổng drop: ${totalDrop.toLocaleString('vi-VN')} lượt`}
              accentColor="#F38144"
              delay={320}
            />
            <KPICard
              icon="⏱️"
              label="Drop TB/Người/Giờ"
              value={activeHours > 0 ? +(totalDrop / activeHours).toFixed(2) : 0}
              unit="lượt/giờ"
              subtitle={`Giờ thao tác thực tế`}
              accentColor="var(--amber)"
              delay={400}
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
                  {fmtDisplay(startDate) === fmtDisplay(endDate) ? fmtDisplay(startDate) : `${fmtDisplay(startDate)} - ${fmtDisplay(endDate)}`}
                </span>
              </div>

              {/* Group legend for Hub tab */}
              {activeTab === 'linker' && groupedRows.length > 0 && (
                <div className={styles.legendRow}>
                  <div className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: '#217887' }} />
                    <span>PST ({linkerPST.length})</span>
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: '#D4560C' }} />
                    <span>NVCT ({linkerNVCT.length})</span>
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: '#2D8D54' }} />
                    <span>Green Human ({linkerGH.length})</span>
                  </div>
                </div>
              )}
              {activeTab === 'hub' && groupedRows.length > 0 && (
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
                <ProductivityChart data={groupedRows} tab={activeTab} />
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
                {groupedRows.length > 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                    ({groupedRows.length} nhân viên)
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
            
            {activeTab === 'linker' && groupedRows.length > 0 && (
              <GroupSummaryTable groups={linkerGroupsData} />
            )}

            {activeTab === 'tongquan' && catDataGrouped.length > 0 && (
              <CategorySummaryTable data={catDataGrouped} />
            )}

            {/* ── Group Comparison Table (Tổng quan only) ── */}
            {activeTab === 'tongquan' && (
              <GroupComparisonTable data={tongQuanGroupStats} numDays={numDays} />
            )}

            {/* ── Hourly heatmap (Tổng quan only) ── */}
            {activeTab === 'tongquan' && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '0.25rem', paddingBottom: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: '1.1rem' }}>⏱️</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Năng suất theo giờ
                  </span>
                  <span style={{
                    fontSize: '0.72rem', color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px', padding: '0.2rem 0.5rem',
                  }}>
                    14:00 → 02:00
                  </span>
                  {hourlyRows.length === 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#F38144', marginLeft: 'auto' }}>
                      ⚠️ Chạy agent để có dữ liệu giờ
                    </span>
                  )}
                </div>
                <HourlyHeatmap hourlyRows={hourlyRows} date={endDate} valueKey="tongKg" valueLabel="KG" unit="kg" />
              </div>
            )}

            {/* ── Drop Hourly heatmap (Tổng quan only) ── */}
            {activeTab === 'tongquan' && (
              <div style={{ marginTop: '2.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '0.25rem', paddingBottom: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: '1.1rem' }}>⏱️</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Số lượt Drop theo giờ
                  </span>
                  <span style={{
                    fontSize: '0.72rem', color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px', padding: '0.2rem 0.5rem',
                  }}>
                    14:00 → 02:00
                  </span>
                  {dropHourlyRows.length === 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#F38144', marginLeft: 'auto' }}>
                      ⚠️ Chưa có dữ liệu Drop theo giờ
                    </span>
                  )}
                </div>
                <HourlyHeatmap hourlyRows={dropHourlyRows} date={endDate} valueKey="tongDrop" valueLabel="Drop" unit="lượt" />
              </div>
            )}

            <WorkerTable data={groupedRows} tab={activeTab} />
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
            <h1>KHO RAU CỦ — DASHBOARD NĂNG SUẤT</h1>
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
