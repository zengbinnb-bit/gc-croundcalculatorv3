// 诊断端点 v12 — 测试 AI 搜索 + Reddit + Google Trends
export default async function handler(req, res) {
  const { keyword } = req.query;
  const testKeyword = keyword || 'workbench';
  const baseUrl = `https://${req.headers.host}`;
  const results = {};

  // 1. 测试 AI 搜索 API（v12 核心数据源）
  try {
    const resp = await fetch(`${baseUrl}/api/ai-search?keyword=${encodeURIComponent(testKeyword)}`, {
      signal: AbortSignal.timeout(25000),
    });
    const body = await resp.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = body.substring(0, 500); }
    results['ai-search'] = {
      status: resp.status,
      ok: resp.ok,
      hasHeats: parsed && parsed.heats ? true : false,
      heats: parsed && parsed.heats ? parsed.heats : null,
      source: parsed && parsed.source ? parsed.source : null,
      error: parsed && parsed.error ? parsed.error : null,
      stateCount: parsed && parsed.details ? parsed.details.totalStates : null,
      geminiEnabled: parsed && parsed.details ? parsed.details.geminiEnabled : false,
      hint: parsed && parsed.hint ? parsed.hint : null
    };
  } catch (err) {
    results['ai-search'] = { status: 0, ok: false, error: err.message };
  }

  // 2. 测试 Pollinations.ai 直连
  try {
    const pollResp = await fetch('https://text.pollinations.ai/hello?model=openai', {
      signal: AbortSignal.timeout(10000),
    });
    results['pollinations'] = {
      status: pollResp.status,
      ok: pollResp.ok,
      preview: (await pollResp.text()).substring(0, 100)
    };
  } catch (err) {
    results['pollinations'] = { status: 0, ok: false, error: err.message };
  }

  // 3. 测试 Gemini API（如果配置了 Key）
  results['gemini'] = {
    configured: !!process.env.GEMINI_API_KEY,
    note: process.env.GEMINI_API_KEY ? 'API Key 已配置' : '未配置 GEMINI_API_KEY（从 https://aistudio.google.com/app/apikey 免费获取）'
  };

  // 4. 测试 Reddit JSON API 直连
  try {
    const redditResp = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(testKeyword)}&limit=3&sort=relevance`, {
      headers: { 'User-Agent': 'ProductHeatMap/1.0 (research bot)' },
      signal: AbortSignal.timeout(10000),
    });
    const redditData = await redditResp.json();
    const posts = redditData?.data?.children || [];
    results['reddit-broad'] = {
      status: redditResp.status,
      ok: redditResp.ok,
      postCount: posts.length,
      preview: posts.slice(0, 2).map(p => p.data?.title?.substring(0, 80) || '')
    };
  } catch (err) {
    results['reddit-broad'] = { status: 0, ok: false, error: err.message };
  }

  // 5. 测试 question-search API 路由
  try {
    const resp = await fetch(`${baseUrl}/api/question-search?keyword=${encodeURIComponent(testKeyword)}`, {
      signal: AbortSignal.timeout(25000),
    });
    const body = await resp.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = body.substring(0, 500); }
    results['question-search'] = {
      status: resp.status,
      ok: resp.ok,
      hasHeats: parsed && parsed.heats ? true : false,
      heats: parsed && parsed.heats ? parsed.heats : null,
      error: parsed && parsed.error ? parsed.error : null,
      successfulSubs: parsed && parsed.details ? parsed.details.successfulSubreddits : null
    };
  } catch (err) {
    results['question-search'] = { status: 0, ok: false, error: err.message };
  }

  // 6. 测试 Google Trends
  try {
    const resp = await fetch(`${baseUrl}/api/google-trends?keyword=${encodeURIComponent(testKeyword)}`, {
      signal: AbortSignal.timeout(15000),
    });
    const body = await resp.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = body.substring(0, 300); }
    results['google-trends'] = {
      status: resp.status,
      ok: resp.ok,
      error: parsed && parsed.error ? parsed.error : null
    };
  } catch (err) {
    results['google-trends'] = { status: 0, ok: false, error: err.message };
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    testKeyword,
    summary: {
      aiSearch: results['ai-search']?.ok ? (results['ai-search']?.hasHeats ? 'OK (heats returned, ' + results['ai-search'].stateCount + ' states)' : 'OK (no heats)') : 'FAILED',
      aiSource: results['ai-search']?.source || 'N/A',
      gemini: results['gemini']?.configured ? 'Configured' : 'Not configured',
      pollinations: results['pollinations']?.ok ? 'OK' : 'FAILED',
      redditBroad: results['reddit-broad']?.ok ? 'OK' : 'FAILED',
      questionSearch: results['question-search']?.ok ? (results['question-search']?.hasHeats ? 'OK (heats returned)' : 'OK (no heats)') : 'FAILED',
      googleTrends: results['google-trends']?.ok ? 'OK' : 'FAILED (expected)'
    },
    results
  });
}
