'use strict';

const express = require('express');
const axios   = require('axios');
const cheerio = require('cheerio');
const path    = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PLC_IP        = process.env.PLC_IP   || '192.168.0.2';
const PLC_USER      = process.env.PLC_USER || '';
const PLC_PASS      = process.env.PLC_PASS || '';
const PORT          = parseInt(process.env.PORT || '3000', 10);
const POLL_TIMEOUT  = 4000;
const WRITE_TIMEOUT = 5000;

const PORTAL_URL   = `http://${PLC_IP}/Portal/Portal.mwsl?PriNav=Vartables`;
const VARTABLE_URL = `http://${PLC_IP}/VarTable`;
const START_URL    = `http://${PLC_IP}/Portal/Portal.mwsl?intro_enter_button=ENTER&PriNav=Start&coming_from_intro=true`;

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Session cookie jar
// ---------------------------------------------------------------------------
let sessionCookie = '';

function extractCookies(headers) {
  const raw = headers['set-cookie'];
  if (!raw) return;
  sessionCookie = (Array.isArray(raw) ? raw : [raw])
    .map(c => c.split(';')[0])
    .join('; ');
}

function buildHeaders(extra = {}) {
  const h = { ...extra };
  if (sessionCookie) h['Cookie'] = sessionCookie;
  if (PLC_USER) h['Authorization'] =
    'Basic ' + Buffer.from(`${PLC_USER}:${PLC_PASS}`).toString('base64');
  return h;
}

// ---------------------------------------------------------------------------
// Fetch the raw watch table HTML from the PLC
// ---------------------------------------------------------------------------
async function getWatchTable() {
  const res = await axios.get(PORTAL_URL, {
    headers: buildHeaders(),
    timeout: POLL_TIMEOUT,
    validateStatus: () => true,
  });
  extractCookies(res.headers);
  return res.data;
}

// ---------------------------------------------------------------------------
// Parse watch table HTML → tagMap
//   { '"DB_Tank".SP_Min' : { row:'6', typeCode:'3003', monVal:'40.0' } }
// ---------------------------------------------------------------------------
function parseWatchTable(html) {
  const $ = cheerio.load(html);
  const tagMap = {};

  $('tr').each((_i, tr) => {
    const cells = $(tr).find('> td');
    if (cells.length < 5) return;

    const tagName = $(cells[0]).text().trim();
    if (!tagName || !tagName.includes('DB_')) return;

    const monRaw = $(cells[3]).find('div.updatable').text()
                || $(cells[3]).text();
    const monVal = monRaw.replace(/\u00a0/g, '').trim();

    const hiddenInput = $(cells[4]).find('input[type="hidden"]');
    const hiddenName  = hiddenInput.attr('name') || '';
    const typeCode    = hiddenInput.attr('value') || '';

    const match = hiddenName.match(/^a1t(\d+)$/);
    if (!match) return;

    tagMap[tagName] = { row: match[1], typeCode, monVal };
  });

  return tagMap;
}

// ---------------------------------------------------------------------------
// Parse the Start/Identification page → { model, mode }
// ---------------------------------------------------------------------------
function parseStartPage(html) {
  const $ = cheerio.load(html);
  let model = null, mode = null;

  $('tr').each((_i, tr) => {
    const cells = $(tr).find('> td');
    if (cells.length < 2) return;
    const label = $(cells[0]).text().trim().replace(/:$/, '');
    const value = $(cells[1]).text().trim();
    if (/^Module type$/i.test(label))    model = value;
    if (/^Operating Mode$/i.test(label)) mode  = value.toUpperCase();
  });

  // Fallback: plain-text regex if table markup didn't match
  if (!model || !mode) {
    const text = $.root().text().replace(/\s+/g, ' ');
    if (!model) {
      const m = text.match(/Module type[:\s]+([A-Za-z0-9 \-]+?)(?=\s{2,}|Status:|Operating)/);
      if (m) model = m[1].trim();
    }
    if (!mode) {
      const m = text.match(/Operating Mode[:\s]+([A-Za-z]+)/i);
      if (m) mode = m[1].toUpperCase();
    }
  }

  return { model, mode };
}

// ---------------------------------------------------------------------------
// GET /api/poll
// ---------------------------------------------------------------------------
app.get('/api/poll', async (req, res) => {
  try {
    const html   = await getWatchTable();
    const tagMap = parseWatchTable(html);

    function getVal(dbName, key) {
      const e = tagMap[`"${dbName}".${key}`];
      return e ? e.monVal : null;
    }
    function toBool(v) {
      return v === 'TRUE' || v === 'true' || v === '1';
    }

    const lv = getVal('DB_Tank', 'Tank_Level');
    const po = getVal('DB_Tank', 'Pump_On');

    if (lv === null && po === null) {
      const sample = Object.keys(tagMap).slice(0, 8).join(' | ');
      return res.json({ ok: false, sample: sample || '(empty table — check PLC web server)' });
    }

    const smn = getVal('DB_Tank', 'SP_Min');
    const smx = getVal('DB_Tank', 'SP_Max');
    const ah  = getVal('DB_Tank', 'Alarm_High');
    const al  = getVal('DB_Tank', 'Alarm_Low');
    const es  = getVal('DB_Tank', 'Em_Stop');
    const sl  = getVal('DB_Tank', 'Sim_Level');
    const sr  = getVal('DB_Tank', 'System_Run');
    const rt  = getVal('DB_Runtime', 'Runtime_Hours');
    const ar  = getVal('DB_Tank', 'Alarm_Reset');

    res.json({
      ok:           true,
      tankLevel:    lv  !== null ? parseFloat(lv)  : null,
      spMin:        smn !== null ? parseFloat(smn) : null,
      spMax:        smx !== null ? parseFloat(smx) : null,
      pumpOn:       po  !== null ? toBool(po)       : null,
      alarmHigh:    ah  !== null ? toBool(ah)       : null,
      alarmLow:     al  !== null ? toBool(al)       : null,
      emStop:       es  !== null ? toBool(es)       : null,
      alarmReset:   ar  !== null ? toBool(ar)       : null,
      simLevel:     sl  !== null ? parseFloat(sl)  : null,
      systemRun:    sr  !== null ? toBool(sr)       : null,
      runtimeHours: rt  !== null ? parseFloat(rt)  : null,   // PLC DB_Runtime.Runtime_Hours — authoritative
    });

  } catch (err) {
    console.error('[poll]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/write  { tag: '"DB_Tank".SP_Min', value: '38.0' }
// ---------------------------------------------------------------------------
app.post('/api/write', async (req, res) => {
  const { tag, value } = req.body;
  if (!tag || value === undefined) {
    return res.status(400).json({ ok: false, error: 'Missing tag or value' });
  }

  try {
    const html   = await getWatchTable();
    const tagMap = parseWatchTable(html);

    const entry = tagMap[tag];
    if (!entry) {
      const available = Object.keys(tagMap).join(', ');
      console.warn(`[write] Tag not found: "${tag}"`);
      return res.json({
        ok: false,
        error: `Tag "${tag}" not found`,
        available: Object.keys(tagMap),
      });
    }

    const { row, typeCode } = entry;
    const body = new URLSearchParams({
      [`a1t${row}`]: typeCode,
      [`a1v${row}`]: String(value),
      'ApplyVars':   'Apply',
    }).toString();

    console.log(`[write] ${tag} = ${value}`);

    const writeRes = await axios.post(VARTABLE_URL, body, {
      headers: buildHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer':      PORTAL_URL,
      }),
      timeout:        WRITE_TIMEOUT,
      validateStatus: () => true,
    });
    extractCookies(writeRes.headers);

    console.log(`[write] ✓ HTTP ${writeRes.status}`);
    res.json({ ok: true, tag, value, httpStatus: writeRes.status });

  } catch (err) {
    console.error('[write]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/cpuinfo — CPU model + operating mode (RUN/STOP)
// ---------------------------------------------------------------------------
app.get('/api/cpuinfo', async (req, res) => {
  try {
    const r = await axios.get(START_URL, {
      headers: buildHeaders(),
      timeout: POLL_TIMEOUT,
      validateStatus: () => true,
    });
    extractCookies(r.headers);
    const { model, mode } = parseStartPage(r.data);
    res.json({ ok: !!(model || mode), model, mode, ip: PLC_IP });
  } catch (err) {
    console.error('[cpuinfo]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/cpudebug  — raw Start-page text for diagnosing model/mode parsing
// ---------------------------------------------------------------------------
app.get('/api/cpudebug', async (req, res) => {
  try {
    const r = await axios.get(START_URL, {
      headers: buildHeaders(),
      timeout: POLL_TIMEOUT,
      validateStatus: () => true,
    });
    extractCookies(r.headers);
    res.type('text/plain').send(r.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/debug  — parsed watch tagMap
// ---------------------------------------------------------------------------
app.get('/api/debug', async (req, res) => {
  try {
    const html   = await getWatchTable();
    const tagMap = parseWatchTable(html);
    res.json(tagMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Tank HMI Node server  →  http://localhost:${PORT}`);
  console.log(`Proxying PLC at         http://${PLC_IP}`);
});
