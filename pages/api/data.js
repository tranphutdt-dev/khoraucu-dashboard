// pages/api/data.js
// Fetches productivity data from Google Sheets public CSV export.
// Parses CSV using PapaParse and returns structured JSON.
// Implements a 5-minute in-memory cache to avoid hammering the sheet.

import Papa from 'papaparse';

// ── In-memory cache ────────────────────────────────────────
let cache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Date normaliser ────────────────────────────────────────
// Converts "23.May.26" → "2026-05-23"  (ISO format for sorting)
function normaliseDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim();

  // Pattern: DD.MonthAbbr.YY or DD.MonthAbbr.YYYY
  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04',
    may: '05', jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // Try DD.MMM.YY(YY)
  const m = cleaned.match(/^(\d{1,2})\.([A-Za-z]+)\.(\d{2,4})$/);
  if (m) {
    const day   = m[1].padStart(2, '0');
    const month = monthMap[m[2].toLowerCase().slice(0, 3)];
    let   year  = m[3];
    if (year.length === 2) year = '20' + year;
    if (month) return `${year}-${month}-${day}`;
  }

  // Fallback: try native Date parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return cleaned; // return as-is if nothing works
}

// ── Number sanitiser ───────────────────────────────────────
function toNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return 0;
  // Remove thousand separators, spaces, replace comma decimals
  const cleaned = String(raw).replace(/\s/g, '').replace(/,/g, '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ── Main handler ───────────────────────────────────────────
export default async function handler(req, res) {
  // Allow CORS for same-origin only (Next.js default)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sheetId = process.env.NEXT_PUBLIC_DASHBOARD_SHEET_ID;

  if (!sheetId || sheetId.trim() === '') {
    return res.status(200).json({
      rows: [],
      error: 'SHEET_ID_MISSING',
      message: 'Chưa cấu hình NEXT_PUBLIC_DASHBOARD_SHEET_ID trong .env.local',
    });
  }

  // Check cache freshness
  const now = Date.now();
  if (cache && now - cacheTimestamp < CACHE_TTL_MS) {
    return res.status(200).json({ rows: cache, cached: true });
  }

  // Build the public CSV export URL for the "Data" tab
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Data`;

  try {
    const response = await fetch(csvUrl, {
      headers: { Accept: 'text/csv' },
      // 10-second timeout
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();

    // Parse CSV
    const { data: rawRows, errors } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
    });

    if (errors.length > 0) {
      console.warn('[api/data] PapaParse warnings:', errors.slice(0, 3));
    }

    // Map raw CSV columns to typed row objects
    // Expected columns: Ngày, Loại kho, Người chia hàng, Nhóm, Tổng gram (gr), Tổng kg
    const rows = rawRows
      .filter((r) => {
        // Skip header-only repeated rows or blank date rows
        const dateVal = r['Ngày'] || r['Ng\u00e0y'] || Object.values(r)[0];
        return dateVal && dateVal.trim() !== '' && dateVal.trim().toLowerCase() !== 'ngày';
      })
      .map((r) => {
        // Flexible column key lookup (handles BOM, encoding differences)
        const getCol = (keys) => {
          for (const k of keys) {
            if (r[k] !== undefined) return r[k];
          }
          // fallback: case-insensitive partial match
          const rowKey = Object.keys(r).find((rk) =>
            keys.some((k) => rk.toLowerCase().includes(k.toLowerCase()))
          );
          return rowKey ? r[rowKey] : '';
        };

        const rawDate   = getCol(['Ngày', 'Ng\u00e0y', 'ngay', 'date']);
        const loaiKho   = getCol(['Loại kho', 'Lo\u1ea1i kho', 'loai kho', 'type']);
        const nguoi     = getCol(['Người chia hàng', 'Ng\u01b0\u1eddi chia h\u00e0ng', 'nguoi', 'worker']);
        const nhom      = getCol(['Nhóm', 'Nh\u00f3m', 'nhom', 'group']);
        const tongGram  = getCol(['Tổng gram (gr)', 'T\u1ed5ng gram (gr)', 'tong gram', 'gram']);
        const tongKg    = getCol(['Tổng kg', 'T\u1ed5ng kg', 'tong kg', 'kg']);

        return {
          date:    normaliseDate(rawDate),
          dateRaw: (rawDate || '').trim(),
          loaiKho: (loaiKho || '').trim(),
          nguoi:   (nguoi   || '').trim(),
          nhom:    (nhom    || '').trim(),
          tongGram: toNumber(tongGram),
          tongKg:   toNumber(tongKg),
        };
      })
      .filter((r) => r.date && r.nguoi); // must have date and worker name

    // Update cache
    cache = rows;
    cacheTimestamp = now;

    return res.status(200).json({ rows, cached: false });
  } catch (err) {
    console.error('[api/data] Fetch error:', err);
    // Return stale cache if available
    if (cache) {
      return res.status(200).json({ rows: cache, cached: true, stale: true });
    }
    return res.status(500).json({
      rows: [],
      error: 'FETCH_ERROR',
      message: err.message || 'Không thể tải dữ liệu từ Google Sheets',
    });
  }
}
