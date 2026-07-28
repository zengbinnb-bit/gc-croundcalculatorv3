// Google Suggest API 代理 — 服务端转发
// 修复：完整错误信息返回
export default async function handler(req, res) {
  const { keyword } = req.query;
  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword parameter' });
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      return res.status(502).json({
        error: `Google Suggest request failed (HTTP ${resp.status})`,
        status: resp.status
      });
    }
    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({
        error: 'Google Suggest returned non-JSON response',
        preview: text.substring(0, 200)
      });
    }
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: 'Internal server error in google-suggest proxy',
      message: err.message
    });
  }
}
