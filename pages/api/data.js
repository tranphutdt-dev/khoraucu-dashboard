// pages/api/data.js
// Fetches productivity data from Google Sheets public CSV export.
// Returns both summary rows (Data sheet) and hourly analysis rows (Hourly sheet).
// Implements a 5-minute in-memory cache.

import Papa from 'papaparse';

// ── In-memory cache ────────────────────────────────────────
let cache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Date normaliser ────────────────────────────────────────
function normaliseDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim();
  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04',
    may: '05', jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const m = cleaned.match(/^(\d{1,2})\.([A-Za-z]+)\.(\d{2,4})$/);
  if (m) {
    const day   = m[1].padStart(2, '0');
    const month = monthMap[m[2].toLowerCase().slice(0, 3)];
    let   year  = m[3];
    if (year.length === 2) year = '20' + year;
    if (month) return `${year}-${month}-${day}`;
  }
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return cleaned;
}

// ── Number sanitiser ───────────────────────────────────────
function toNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return 0;
  const cleaned = String(raw).replace(/\s/g, '').replace(/,/g, '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ── Flexible column getter ──────────────────────────────────
function getCol(r, keys) {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== null) return r[k];
  }
  const rowKey = Object.keys(r).find((rk) =>
    keys.some((k) => rk.toLowerCase().includes(k.toLowerCase()))
  );
  return rowKey ? r[rowKey] : '';
}

// ── Fetch CSV from sheet ───────────────────────────────────
async function fetchCSV(sheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId.trim()}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1`;
  const response = await fetch(url, {
    headers: { Accept: 'text/csv' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching sheet "${sheetName}"`);
  return response.text();
}

// ── Parse Data sheet ───────────────────────────────────────
function parseDataSheet(csvText) {
  const { data: rawRows } = Papa.parse(csvText, {
    header: true, skipEmptyLines: true, trimHeaders: true,
  });
  return rawRows
    .filter((r) => {
      const dateVal = getCol(r, ['Ngày', 'ngay', 'date']);
      return dateVal && dateVal.trim() !== '' && dateVal.trim().toLowerCase() !== 'ngày';
    })
    .map((r) => ({
      date:     normaliseDate(getCol(r, ['Ngày', 'ngay', 'date'])),
      dateRaw:  (getCol(r, ['Ngày', 'ngay', 'date']) || '').trim(),
      loaiKho:  (getCol(r, ['Loại kho', 'loai kho', 'type']) || '').trim(),
      nguoi:    (getCol(r, ['Người chia hàng', 'nguoi', 'worker']) || '').trim(),
      nhom:     (getCol(r, ['Nhóm', 'nhom', 'group']) || '').trim(),
      tongGram: toNumber(getCol(r, ['Tổng gram (gr)', 'tong gram', 'gram'])),
      tongKg:   toNumber(getCol(r, ['Tổng kg', 'tong kg', 'kg'])),
    }))
    .filter((r) => r.date && r.nguoi);
}

// ── Parse Hourly sheet ─────────────────────────────────────
const HOUR_LABELS = ['14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00'];

function parseHourlySheet(csvText) {
  const { data: rawRows } = Papa.parse(csvText, {
    header: true, skipEmptyLines: true, trimHeaders: true,
  });
  return rawRows
    .filter((r) => {
      const dateVal = getCol(r, ['Ngày', 'ngay', 'date']);
      return dateVal && dateVal.trim() !== '' && dateVal.trim().toLowerCase() !== 'ngày';
    })
    .map((r) => {
      const hours = {};
      for (const h of HOUR_LABELS) {
        hours[h] = toNumber(r[h] ?? r[h.replace(':', 'h')] ?? 0);
      }
      return {
        date:    normaliseDate(getCol(r, ['Ngày', 'ngay', 'date'])),
        nganh:   (getCol(r, ['Ngành hàng', 'nganh hang']) || '').trim(),
        nhom:    (getCol(r, ['Nhóm', 'nhom', 'group']) || '').trim(),
        nguoi:   (getCol(r, ['Người chia hàng', 'nguoi', 'worker']) || '').trim(),
        tongKg:  toNumber(getCol(r, ['Tổng KG', 'tong kg', 'kg'])),
        hours,
      };
    })
    .filter((r) => r.date && r.nguoi);
}

// ── Parse Drop Hourly sheet ─────────────────────────────────────
function parseDropHourlySheet(csvText) {
  const { data: rawRows } = Papa.parse(csvText, {
    header: true, skipEmptyLines: true, trimHeaders: true,
  });
  return rawRows
    .filter((r) => {
      const dateVal = getCol(r, ['Ngày', 'ngay', 'date']);
      return dateVal && dateVal.trim() !== '' && dateVal.trim().toLowerCase() !== 'ngày';
    })
    .map((r) => {
      const hours = {};
      for (const h of HOUR_LABELS) {
        hours[h] = toNumber(r[h] ?? r[h.replace(':', 'h')] ?? 0);
      }
      return {
        date:    normaliseDate(getCol(r, ['Ngày', 'ngay', 'date'])),
        nganh:   (getCol(r, ['Ngành hàng', 'nganh hang']) || '').trim(),
        nhom:    (getCol(r, ['Nhóm', 'nhom', 'group']) || '').trim(),
        nguoi:   (getCol(r, ['Người chia hàng', 'nguoi', 'worker']) || '').trim(),
        tongDrop: toNumber(getCol(r, ['Tổng Drop', 'tong drop', 'drop'])),
        hours,
      };
    })
    .filter((r) => r.date && r.nguoi);
}

// ── Main handler ───────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sheetId = process.env.DASHBOARD_SHEET_ID || process.env.NEXT_PUBLIC_DASHBOARD_SHEET_ID;

  if (!sheetId || sheetId.trim() === '') {
    return res.status(200).json({
      rows: [], hourlyRows: [], dropHourlyRows: [],
      error: 'SHEET_ID_MISSING',
      message: 'Chưa cấu hình NEXT_PUBLIC_DASHBOARD_SHEET_ID trong .env.local',
    });
  }

  // Cache check
  const now = Date.now();
  if (cache && now - cacheTimestamp < CACHE_TTL_MS) {
    return res.status(200).json({ ...cache, cached: true });
  }

  try {
    // Fetch all sheets concurrently
    const [dataCsv, hourlyCsv, dropHourlyCsv] = await Promise.allSettled([
      fetchCSV(sheetId, 'Data'),
      fetchCSV(sheetId, 'Hourly'),
      fetchCSV(sheetId, 'Drop_Hourly'),
    ]);

    const rows           = dataCsv.status === 'fulfilled'       ? parseDataSheet(dataCsv.value)         : [];
    const hourlyRows     = hourlyCsv.status === 'fulfilled'     ? parseHourlySheet(hourlyCsv.value)     : [];
    const dropHourlyRows = dropHourlyCsv.status === 'fulfilled' ? parseDropHourlySheet(dropHourlyCsv.value) : [];

    if (dataCsv.status === 'rejected') {
      console.error('[api/data] Error fetching Data sheet:', dataCsv.reason);
    }
    if (hourlyCsv.status === 'rejected') {
      console.warn('[api/data] Hourly sheet not available yet (will be populated after next agent run):', hourlyCsv.reason?.message);
    }
    if (dropHourlyCsv.status === 'rejected') {
      console.warn('[api/data] Drop_Hourly sheet not available yet:', dropHourlyCsv.reason?.message);
    }

    const payload = { rows, hourlyRows, dropHourlyRows, cached: false };
    cache = payload;
    cacheTimestamp = now;

    return res.status(200).json(payload);
  } catch (err) {
    console.error('[api/data] Fetch error:', err);
    if (cache) {
      return res.status(200).json({ ...cache, cached: true, stale: true });
    }
    return res.status(500).json({
      rows: [], hourlyRows: [], dropHourlyRows: [],
      error: 'FETCH_ERROR',
      message: err.message || 'Không thể tải dữ liệu từ Google Sheets',
    });
  }
}
