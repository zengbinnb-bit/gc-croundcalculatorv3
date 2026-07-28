// Wikipedia API 代理 — 搜索文章 + 获取页面浏览量，服务端转发
// 修复：完整错误信息返回 + 更规范的 User-Agent
export default async function handler(req, res) {
  const { keyword } = req.query;
  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword parameter' });
  }

  try {
    // Step 1: 搜索文章标题
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(keyword)}&srlimit=1&origin=*`;
    const searchResp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'GoodCangShippingCalculator/1.0 (contact@example.com)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!searchResp.ok) {
      return res.status(502).json({
        error: `Wikipedia search failed (HTTP ${searchResp.status})`,
        status: searchResp.status
      });
    }
    const searchData = await searchResp.json();
    if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
      return res.status(200).json({ title: null, items: [], message: 'No Wikipedia article found' });
    }
    const title = searchData.query.search[0].title;

    // Step 2: 获取近 60 天页面浏览量
    const now = new Date();
    const end = new Date(now.getTime() - 86400000);
    const start = new Date(end.getTime() - 60 * 86400000);
    const fmt = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    const startDate = fmt(start);
    const endDate = fmt(end);

    const pvUrl = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(title.replace(/ /g, '_'))}/daily/${startDate}/${endDate}`;
    const pvResp = await fetch(pvUrl, {
      headers: {
        'User-Agent': 'GoodCangShippingCalculator/1.0 (contact@example.com)',
        'Api-User-Agent': 'GoodCangShippingCalculator/1.0 (contact@example.com)'
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!pvResp.ok) {
      return res.status(200).json({ title, items: [], message: `Pageviews request failed (HTTP ${pvResp.status})` });
    }
    const pvData = await pvResp.json();

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ title, items: pvData.items || [] });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal server error in wikipedia proxy',
      message: err.message
    });
  }
}
