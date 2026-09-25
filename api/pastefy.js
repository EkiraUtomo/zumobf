module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-ZumObf-Pastefy', 'v2');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'ZumObf Pastefy proxy' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const auth = String(req.headers.authorization || '').trim();
    const token = String(body.token || auth).trim().replace(/^Bearer\s+/i, '');
    if (!token) return res.status(400).json({ error: 'Pastefy API token is required.' });

    const paste = body.paste && typeof body.paste === 'object' ? body.paste : {};
    if (typeof paste.content !== 'string') {
      return res.status(400).json({ error: 'Paste content is required.' });
    }

    const payload = {
      title: String(paste.title || 'ZumObf output'),
      content: paste.content,
      visibility: String(paste.visibility || 'UNLISTED'),
      type: 'PASTE'
    };

    const upstream = await fetch('https://pastefy.app/api/v2/paste', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

    if (!upstream.ok) {
      const pick = (v) => {
        if (v == null) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'object') {
          for (const k of ['message', 'error', 'detail', 'details', 'reason']) {
            if (v[k] != null) {
              const x = pick(v[k]);
              if (x) return x;
            }
          }
          try { return JSON.stringify(v); } catch (_) { return String(v); }
        }
        return String(v);
      };
      const message = pick(data.message || data.error || data.details || data.detail || data.raw);
      return res.status(upstream.status).json({
        error: message || `Pastefy returned HTTP ${upstream.status}`,
        status: upstream.status,
        upstream: data
      });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: err && err.message ? err.message : 'Pastefy request failed.' });
  }
};
