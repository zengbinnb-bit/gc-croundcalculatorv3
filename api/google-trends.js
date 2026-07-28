// Google Trends API 代理 — 服务端转发
// 修复：处理 Google consent cookie 机制 + 完整错误信息返回
export default async function handler(req, res) {
  const { keyword } = req.query;
  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword parameter' });
  }

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

  try {
    // Step 0: 先访问 Google Trends 首页获取 cookie（绕过 consent 机制）
    let cookieStr = '';
    try {
      const homeResp = await fetch('https://trends.google.com/trends/explore?geo=US&q=' + encodeURIComponent(keyword), {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });
      // 从 set-cookie 头提取 cookie
      const setCookies = homeResp.headers.getSetCookie?.() || [];
      if (setCookies.length > 0) {
        cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
      }
    } catch (e) {
      // 首页访问失败不致命，继续尝试
    }

    // 如果没拿到 cookie，手动设一个 consent cookie
    if (!cookieStr) {
      cookieStr = 'CONSENT=YES+cb.20240101-00-p0.en+FX+999';
    }

    const apiHeaders = {
      'User-Agent': UA,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': cookieStr,
      'Referer': 'https://trends.google.com/trends/explore?geo=US&q=' + encodeURIComponent(keyword),
    };

    // Step 1: 获取 widget token
    const widgetReq = JSON.stringify({
      comparisonItem: [{ keyword, geo: 'US', time: 'today 12-m' }],
      category: 0,
      property: ''
    });
    const widgetUrl = `https://trends.google.com/trends/api/widgets?hl=en-US&tz=-480&req=${encodeURIComponent(widgetReq)}`;

    const widgetResp = await fetch(widgetUrl, { headers: apiHeaders });
    if (!widgetResp.ok) {
      return res.status(502).json({
        error: `Google Trends widget request failed (HTTP ${widgetResp.status})`,
        hint: widgetResp.status === 429 ? 'Rate limited by Google' : widgetResp.status === 403 ? 'Blocked by Google (datacenter IP)' : 'Google Trends API error',
        status: widgetResp.status
      });
    }

    const widgetText = await widgetResp.text();
    // Google Trends API 响应以 )]}' 前缀开头，需要去除
    const cleanedWidget = widgetText.replace(/^\)\]\}'/, '').trim();

    let widgetData;
    try {
      widgetData = JSON.parse(cleanedWidget);
    } catch (e) {
      // 可能是 consent 重定向返回了 HTML
      return res.status(502).json({
        error: 'Google Trends returned non-JSON response (likely consent page)',
        hint: 'Google Trends consent flow blocked the API request',
        preview: cleanedWidget.substring(0, 200)
      });
    }

    if (!widgetData || !widgetData.widgets) {
      return res.status(502).json({
        error: 'Invalid widget response structure',
        hint: 'Google Trends returned unexpected data format'
      });
    }

    // 找到 GEO_MAP widget
    let geoWidget = null;
    for (const w of widgetData.widgets) {
      if (w.id === 'GEO_MAP' || w.id === 'GEO_MAP_STATE') { geoWidget = w; break; }
    }
    if (!geoWidget) {
      return res.status(404).json({
        error: 'GEO_MAP widget not found',
        hint: 'Google Trends may not have enough data for this keyword',
        availableWidgets: widgetData.widgets.map(w => w.id)
      });
    }

    // Step 2: 获取地理热度数据
    const geoReqStr = JSON.stringify(geoWidget.request);
    const geoUrl = `https://trends.google.com/trends/api/widgetdata/comparedgeomap?hl=en-US&tz=-480&req=${encodeURIComponent(geoReqStr)}&token=${geoWidget.token}`;

    const geoResp = await fetch(geoUrl, { headers: apiHeaders });
    if (!geoResp.ok) {
      return res.status(502).json({
        error: `Google Trends geo data request failed (HTTP ${geoResp.status})`,
        status: geoResp.status
      });
    }

    const geoText = await geoResp.text();
    const cleanedGeo = geoText.replace(/^\)\]\}'/, '').trim();

    let geoData;
    try {
      geoData = JSON.parse(cleanedGeo);
    } catch (e) {
      return res.status(502).json({
        error: 'Google Trends geo data returned non-JSON',
        preview: cleanedGeo.substring(0, 200)
      });
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(geoData);
  } catch (err) {
    return res.status(500).json({
      error: 'Internal server error in google-trends proxy',
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 3).join(' | ')
    });
  }
}
