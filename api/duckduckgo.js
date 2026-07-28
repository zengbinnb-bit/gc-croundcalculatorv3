// DuckDuckGo API 代理 — 服务端转发
// 支持两种模式：
// 1. Instant Answer API（默认，?keyword= 或 ?query=）
// 2. HTML 搜索（?mode=html&query=...）— 返回真实搜索结果文本
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  const { keyword, query, mode } = req.query;
  const q = query || keyword;
  if (!q) {
    return res.status(400).json({ error: 'Missing keyword or query parameter' });
  }

  // HTML 搜索模式 — 返回搜索结果文本数组
  if (mode === 'html') {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const resp = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });
      if (!resp.ok) {
        return res.status(502).json({
          error: `DuckDuckGo HTML search failed (HTTP ${resp.status})`,
          status: resp.status
        });
      }
      const html = await resp.text();
      // 提取搜索结果文本
      const texts = [];
      // result__a (标题)
      const titleRegex = /class="result__a"[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      while ((match = titleRegex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        if (text && text.length > 5) texts.push(text);
      }
      // result__snippet (摘要)
      const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      while ((match = snippetRegex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        if (text && text.length > 10) texts.push(text);
      }

      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
      return res.status(200).json({
        query: q,
        resultCount: texts.length,
        results: texts
      });
    } catch (err) {
      return res.status(500).json({
        error: 'DuckDuckGo HTML search error',
        message: err.message
      });
    }
  }

  // 默认模式：Instant Answer API
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      return res.status(502).json({
        error: `DuckDuckGo request failed (HTTP ${resp.status})`,
        status: resp.status
      });
    }
    const data = await resp.json();
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: 'DuckDuckGo proxy error',
      message: err.message
    });
  }
}
