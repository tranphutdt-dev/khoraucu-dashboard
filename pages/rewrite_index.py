import re

with open('index.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Data filters to include grouping
filters_code = """// ── Date helpers ───────────────────────────────────────────
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
}"""

content = re.sub(r'// ── Date helpers ───────────────────────────────────────────.*?// ── Main page ──────────────────────────────────────────────', filters_code + '\n\n// ── Main page ──────────────────────────────────────────────', content, flags=re.DOTALL)

# Replace state variables
content = content.replace("const [selectedDate, setSelectedDate] = useState(null); // ISO string", "const [startDate, setStartDate] = useState(null);\n  const [endDate, setEndDate] = useState(null);")

# Replace default date logic
old_fetch = """      // Default to the latest date available
      if (dates.length > 0) {
        setSelectedDate(prev => prev && dates.includes(prev) ? prev : dates[dates.length - 1]);
      }"""
new_fetch = """      // Default to the latest date available for both start and end
      if (dates.length > 0) {
        const latest = dates[dates.length - 1];
        setStartDate(prev => prev && dates.includes(prev) ? prev : latest);
        setEndDate(prev => prev && dates.includes(prev) ? prev : latest);
      }"""
content = content.replace(old_fetch, new_fetch)

# Replace derived data
old_derived = """  // ── Derived data ─────────────────────────────────────────
  const todayRows     = useMemo(() => rows.filter(r => r.date === selectedDate), [rows, selectedDate]);
  const yesterdayDate = useMemo(() => selectedDate ? prevDay(selectedDate) : null, [selectedDate]);
  const yesterdayRows = useMemo(() => rows.filter(r => r.date === yesterdayDate), [rows, yesterdayDate]);

  const filteredRows  = useMemo(() => filterByTab(todayRows, activeTab), [todayRows, activeTab]);
  const trendData     = useMemo(() => buildTrendData(rows, selectedDate || '', activeTab), [rows, selectedDate, activeTab]);
  const kpis          = useMemo(() => computeKPIs(todayRows, yesterdayRows, activeTab), [todayRows, yesterdayRows, activeTab]);

  // Hub groups breakdown (for Hub tab legend)
  const hubHH     = useMemo(() => filteredRows.filter(r => r.nhom?.toUpperCase() === 'HUYHOANG'), [filteredRows]);
  const hubOthers = useMemo(() => filteredRows.filter(r => r.nhom?.toUpperCase() !== 'HUYHOANG' && r.nhom), [filteredRows]);"""

new_derived = """  // ── Derived data ─────────────────────────────────────────
  const rangeRows = useMemo(() => rows.filter(r => r.date >= startDate && r.date <= endDate), [rows, startDate, endDate]);
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

  const trendData = useMemo(() => buildTrendData(rows, startDate || '', endDate || '', activeTab), [rows, startDate, endDate, activeTab]);
  const kpis = useMemo(() => computeKPIs(groupedRows, prevGroupedRows), [groupedRows, prevGroupedRows]);

  // Hub groups breakdown (for Hub tab legend)
  const hubHH = useMemo(() => groupedRows.filter(r => r.nhom?.toUpperCase() === 'HUYHOANG'), [groupedRows]);
  const hubOthers = useMemo(() => groupedRows.filter(r => r.nhom?.toUpperCase() !== 'HUYHOANG' && r.nhom), [groupedRows]);"""

content = content.replace(old_derived, new_derived)

# Replace handleDateChange
content = content.replace("function handleDateChange(e) {\n    const val = e.target.value; // \"YYYY-MM-DD\"\n    if (val) setSelectedDate(val);\n  }", "function handleStartDateChange(e) { if (e.target.value) setStartDate(e.target.value); }\n  function handleEndDateChange(e) { if (e.target.value) setEndDate(e.target.value); }")

# Update Controls bar UI
old_ui_date = """          {/* ── Controls bar ── */}
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
            </div>"""

new_ui_date = """          {/* ── Controls bar ── */}
          <div className={styles.controlsBar}>
            <div className={styles.datePickerGroup}>
              <span className={styles.dateLabel}>📅 Lọc dữ liệu:</span>
              <input
                type="date"
                value={toInputVal(startDate)}
                onChange={handleStartDateChange}
                min={allDates[0] || ''}
                max={endDate || allDates[allDates.length - 1] || ''}
                className={styles.dateInput}
              />
              <span className={styles.dateSeparator}>—</span>
              <input
                type="date"
                value={toInputVal(endDate)}
                onChange={handleEndDateChange}
                min={startDate || allDates[0] || ''}
                max={allDates[allDates.length - 1] || ''}
                className={styles.dateInput}
              />
            </div>"""
content = content.replace(old_ui_date, new_ui_date)

# Update KPI subtitles
content = content.replace("So với hôm qua:", "So với g.đoạn trước:")
content = content.replace("Ca làm việc hôm nay", "Số người tham gia làm việc")
content = content.replace("`Ngày ${fmtDisplay(selectedDate)}`", "`Giai đoạn: ${fmtDisplay(startDate)} - ${fmtDisplay(endDate)}`")
content = content.replace("`Hub: ${todayRows.filter(r=>r.loaiKho?.toLowerCase().includes('hub')).length} · Linker: ${todayRows.filter(r=>r.loaiKho?.toLowerCase().includes('linker')).length}`", "`Nhân viên làm việc trong giai đoạn này`")
content = content.replace("{fmtDisplay(selectedDate)}", "{fmtDisplay(startDate) === fmtDisplay(endDate) ? fmtDisplay(startDate) : `${fmtDisplay(startDate)} - ${fmtDisplay(endDate)}`}")

# Update Chart variables
content = content.replace("ProductivityChart data={filteredRows}", "ProductivityChart data={groupedRows}")

content = content.replace("WorkerTable data={filteredRows}", "WorkerTable data={groupedRows}")
content = content.replace("({filteredRows.length} bản ghi)", "({groupedRows.length} nhân viên)")

with open('index.js', 'w', encoding='utf-8') as f:
    f.write(content)
