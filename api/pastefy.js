module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      type: String(paste.type || 'LUA')
    };

    if (paste.folder) payload.folder = String(paste.folder);

    const upstream = await fetch('https://pastefy.app/api/v2/paste', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-ZumObf-Pastefy', 'v2');
    return res.status(upstream.status).json(data);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ error: err && err.message ? err.message : 'Pastefy request failed.' });
  }
};
