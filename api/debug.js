// 诊断端点 v13 — 仅测试 AI 搜索（Gemini API + Pollinations.ai）
// 已移除 Google Trends、Reddit、question-search 诊断（这些数据源已弃用）
export default async function handler(req, res) {
  const { keyword } = req.query;
  const testKeyword = keyword || 'workbench';
  const baseUrl = `https://${req.headers.host}`;
  const results = {};

  // 1. 测试 AI 搜索 API（核心数据源）
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
      apiErrors: parsed && parsed.apiErrors ? parsed.apiErrors : null,
      stateCount: parsed && parsed.details ? parsed.details.totalStates : null,
      geminiEnabled: parsed && parsed.details ? parsed.details.geminiEnabled : false,
      hint: parsed && parsed.hint ? parsed.hint : null
    };
  } catch (err) {
    results['ai-search'] = { status: 0, ok: false, error: err.message };
  }

  // 2. 测试 Pollinations.ai 直连（简短 prompt 测试匿名可用性）
  try {
    const pollResp = await fetch('https://text.pollinations.ai/hello', {
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

  // 3. 测试 Gemini API 配置状态
  results['gemini'] = {
    configured: !!process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
    note: process.env.GEMINI_API_KEY
      ? 'API Key 已配置，使用 gemini-2.5-flash 模型'
      : '未配置 GEMINI_API_KEY（从 https://aistudio.google.com/app/apikey 免费获取）。配置后需 Redeploy 才能生效。'
  };

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    testKeyword,
    summary: {
      aiSearch: results['ai-search']?.ok ? (results['ai-search']?.hasHeats ? 'OK (heats returned, ' + results['ai-search'].stateCount + ' states)' : 'OK (no heats)') : 'FAILED',
      aiSource: results['ai-search']?.source || 'N/A',
      gemini: results['gemini']?.configured ? 'Configured (gemini-2.5-flash)' : 'Not configured',
      pollinations: results['pollinations']?.ok ? 'OK' : 'FAILED',
    },
    results
  });
}
