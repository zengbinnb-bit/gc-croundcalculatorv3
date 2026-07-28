// v12 AI 搜索 — 使用 LLM API 进行关键词热度分析
// 核心思路：用 AI（Gemini API 或 Pollinations.ai）回答"哪些州对该产品需求最高"
// 解析 AI 回复中的州排名，映射到美国四大区域，计算热度分布
// 优势：不受 Vercel 数据中心 IP 封锁影响，不依赖 Reddit/Google Trends 等被限流的 API

// 美国州名 → 区域映射（小写全名）
const STATE_TO_REGION = {
  'connecticut':'Northeast','maine':'Northeast','massachusetts':'Northeast','new hampshire':'Northeast',
  'rhode island':'Northeast','vermont':'Northeast','new jersey':'Northeast','new york':'Northeast','pennsylvania':'Northeast',
  'illinois':'Midwest','indiana':'Midwest','michigan':'Midwest','ohio':'Midwest','wisconsin':'Midwest',
  'iowa':'Midwest','kansas':'Midwest','minnesota':'Midwest','missouri':'Midwest','nebraska':'Midwest',
  'north dakota':'Midwest','south dakota':'Midwest',
  'delaware':'South','florida':'South','georgia':'South','maryland':'South','north carolina':'South',
  'south carolina':'South','virginia':'South','west virginia':'South','district of columbia':'South',
  'alabama':'South','kentucky':'South','mississippi':'South','tennessee':'South',
  'arkansas':'South','louisiana':'South','oklahoma':'South','texas':'South',
  'arizona':'West','colorado':'West','idaho':'West','montana':'West','nevada':'West',
  'new mexico':'West','utah':'West','wyoming':'West','alaska':'West','california':'West',
  'hawaii':'West','oregon':'West','washington':'West'
};

// 州名缩写 → 全名
const STATE_ABBR = {
  'al':'alabama','ak':'alaska','az':'arizona','ar':'arkansas','ca':'california','co':'colorado',
  'ct':'connecticut','de':'delaware','fl':'florida','ga':'georgia','hi':'hawaii','id':'idaho',
  'il':'illinois','in':'indiana','ia':'iowa','ks':'kansas','ky':'kentucky','la':'louisiana',
  'me':'maine','md':'maryland','ma':'massachusetts','mi':'michigan','mn':'minnesota','ms':'mississippi',
  'mo':'missouri','mt':'montana','ne':'nebraska','nv':'nevada','nh':'new hampshire','nj':'new jersey',
  'nm':'new mexico','ny':'new york','nc':'north carolina','nd':'north dakota','oh':'ohio','ok':'oklahoma',
  'or':'oregon','pa':'pennsylvania','ri':'rhode island','sc':'south carolina','sd':'south dakota',
  'tn':'tennessee','tx':'texas','ut':'utah','vt':'vermont','va':'virginia','wa':'washington',
  'wv':'west virginia','wi':'wisconsin','wy':'wyoming','dc':'district of columbia'
};

// 所有州名（用于正则匹配）
const ALL_STATES = Object.keys(STATE_TO_REGION);

function normalizeState(name) {
  if (!name) return null;
  let s = name.toLowerCase().trim().replace(/\./g, '').replace(/\s+/g, ' ');
  // 直接匹配全名
  if (STATE_TO_REGION[s]) return s;
  // 匹配缩写
  if (STATE_ABBR[s]) return STATE_ABBR[s];
  // 去掉 "state" 后缀
  let noState = s.replace(/\s+state$/, '');
  if (STATE_TO_REGION[noState]) return noState;
  // 尝试首字母大写匹配
  let cap = s.charAt(0).toUpperCase() + s.slice(1);
  if (STATE_TO_REGION[cap.toLowerCase()]) return cap.toLowerCase();
  return null;
}

// 从 AI 文本回复中提取州排名
function extractStateRankings(text) {
  const rankings = [];
  const seen = new Set();

  // 方式1：查找 JSON 数组（最可靠）
  const jsonMatches = text.match(/\[[\s\S]*?\]/g);
  if (jsonMatches) {
    for (const jsonStr of jsonMatches) {
      try {
        const arr = JSON.parse(jsonStr);
        if (Array.isArray(arr) && arr.length >= 3) {
          for (const item of arr) {
            const stateRaw = item.state || item.State || item.name || item.Name || '';
            const normalized = normalizeState(stateRaw);
            if (normalized && !seen.has(normalized)) {
              seen.add(normalized);
              const score = item.score || item.Score || item.value || item.demand || 0;
              rankings.push({ state: normalized, score: Number(score) || 0 });
            }
          }
          if (rankings.length >= 5) return rankings;
        }
      } catch(e) { /* not valid JSON, continue */ }
    }
  }

  // 方式2：查找带序号的列表（如 "1. California", "## 1. California" 等）
  const statePattern = ALL_STATES.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const stateAbbrPattern = Object.keys(STATE_ABBR).map(s => s.toUpperCase()).join('|');
  const fullPattern = `(?:${statePattern}|(?:\\b)(${stateAbbrPattern})(?:\\b))`;
  
  const numberedRegex = new RegExp(
    `(?:^|\\n)\\s*(?:\\d+\\.?|[•\\-\\*#]+|##?)\\s*(${statePattern})\\b`,
    'gim'
  );
  let match;
  while ((match = numberedRegex.exec(text)) !== null) {
    const stateName = match[1].toLowerCase().trim();
    if (STATE_TO_REGION[stateName] && !seen.has(stateName)) {
      seen.add(stateName);
      rankings.push({ state: stateName, score: 0 });
    }
  }

  // 方式3：扫描文本中所有出现的州名，按出现顺序排名
  if (rankings.length < 5) {
    rankings.length = 0;
    seen.clear();
    const textLower = text.toLowerCase();
    const positions = [];
    for (const stateName of ALL_STATES) {
      const idx = textLower.indexOf(stateName);
      if (idx !== -1) {
        positions.push({ state: stateName, position: idx });
      }
    }
    // Also check abbreviations
    for (const [abbr, full] of Object.entries(STATE_ABBR)) {
      const regex = new RegExp(`\\b${abbr.toUpperCase()}\\b`, 'g');
      const m = regex.exec(text);
      if (m && !seen.has(full)) {
        positions.push({ state: full, position: m.index });
      }
    }
    positions.sort((a, b) => a.position - b.position);
    for (const p of positions) {
      if (!seen.has(p.state)) {
        seen.add(p.state);
        rankings.push({ state: p.state, score: 0 });
      }
    }
  }

  // 为没有 score 的项计算分数（按排名递减）
  const total = rankings.length;
  for (let i = 0; i < rankings.length; i++) {
    if (!rankings[i].score) {
      rankings[i].score = Math.round((total - i) / total * 100);
    }
  }

  return rankings;
}

// 从州排名计算区域热度
function calculateRegionHeat(rankings) {
  const regionScores = { 'Northeast': 0, 'Midwest': 0, 'South': 0, 'West': 0 };
  const regionCounts = { 'Northeast': 0, 'Midwest': 0, 'South': 0, 'West': 0 };

  for (const item of rankings) {
    const region = STATE_TO_REGION[item.state];
    if (!region) continue;
    regionScores[region] += item.score;
    regionCounts[region]++;
  }

  // 归一化到 0-100
  const maxScore = Math.max(...Object.values(regionScores), 0);
  const heats = {};
  for (const region of Object.keys(regionScores)) {
    heats[region] = maxScore > 0 ? Math.round((regionScores[region] / maxScore) * 100) : 0;
  }

  return { heats, regionScores, regionCounts };
}

// ===== 数据源1: Google Gemini API =====
async function searchWithGemini(keyword) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a US consumer market analyst. Based on your knowledge of US consumer spending patterns, e-commerce sales data, housing characteristics, regional demographics, and DIY/home improvement market trends, analyze the demand for "${keyword}" products across US states.

The keyword "${keyword}" may be in any language — if so, translate it to English first, then analyze.

List the top 15 US states with the highest estimated demand for these products, in descending order of demand. Consider factors like population, home ownership rates, garage/basement prevalence, regional culture, climate relevance, and e-commerce sales patterns.

Return your answer as a valid JSON array. Each element must have:
- "state": full US state name (e.g., "California", "Texas", "New York")
- "score": demand score from 0 to 100 (100 = highest demand)

Return ONLY the JSON array. No explanation, no markdown, no code blocks. Example:
[{"state":"California","score":100},{"state":"Texas","score":92},{"state":"Florida","score":88}]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return { error: `Gemini API HTTP ${resp.status}: ${errText.substring(0, 200)}` };
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text || text.length < 10) {
      return { error: 'Gemini API 返回空内容' };
    }

    return { text, source: 'Google Gemini API (gemini-2.0-flash)' };
  } catch (err) {
    return { error: `Gemini API: ${err.name === 'TimeoutError' ? '请求超时(20s)' : err.message}` };
  }
}

// ===== 数据源2: Pollinations.ai (免费, 无需 API Key) =====
async function searchWithPollinations(keyword) {
  const prompt = `You are a US consumer market analyst. Analyze the demand for "${keyword}" products across US states. The keyword may be in any language - translate to English first if needed.

List the top 15 US states with the highest demand for these products, in descending order. Consider population, housing, regional culture, e-commerce patterns.

Return ONLY a valid JSON array, no other text:
[{"state":"California","score":100},{"state":"Texas","score":92},{"state":"Florida","score":88}]

Each element has "state" (full state name) and "score" (0-100 demand score).`;

  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`;

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'Accept': 'text/plain' },
    });

    if (!resp.ok) {
      return { error: `Pollinations HTTP ${resp.status}` };
    }

    const text = await resp.text();
    if (!text || text.length < 10) {
      return { error: 'Pollinations 返回空内容' };
    }

    return { text, source: 'Pollinations.ai (免费 LLM, 无需 API Key)' };
  } catch (err) {
    return { error: `Pollinations: ${err.name === 'TimeoutError' ? '请求超时(20s)' : err.message}` };
  }
}

// ===== 数据源3: Pollinations POST 方式（备用） =====
async function searchWithPollinationsPOST(keyword) {
  const prompt = `You are a US consumer market analyst. Analyze the demand for "${keyword}" products across US states. The keyword may be in any language - translate to English first if needed.

List the top 15 US states with the highest demand for these products, in descending order. Return ONLY a valid JSON array:
[{"state":"California","score":100},{"state":"Texas","score":92}]

Each element: "state" (full state name) and "score" (0-100).`;

  try {
    const resp = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai'
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      return { error: `Pollinations POST HTTP ${resp.status}` };
    }

    const text = await resp.text();
    if (!text || text.length < 10) {
      return { error: 'Pollinations POST 返回空内容' };
    }

    return { text, source: 'Pollinations.ai POST (免费 LLM)' };
  } catch (err) {
    return { error: `Pollinations POST: ${err.message}` };
  }
}

export default async function handler(req, res) {
  const { keyword } = req.query;
  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword parameter' });
  }

  const kw = keyword.trim();
  const apiErrors = [];
  let aiResult = null;

  // 优先使用 Gemini API（如果配置了 API Key）
  if (process.env.GEMINI_API_KEY) {
    aiResult = await searchWithGemini(kw);
    if (aiResult.error) {
      apiErrors.push(aiResult.error);
      aiResult = null;
    }
  }

  // 回退到 Pollinations.ai GET（无需 API Key）
  if (!aiResult) {
    aiResult = await searchWithPollinations(kw);
    if (aiResult.error) {
      apiErrors.push(aiResult.error);
      aiResult = null;
    }
  }

  // 再回退到 Pollinations.ai POST
  if (!aiResult) {
    aiResult = await searchWithPollinationsPOST(kw);
    if (aiResult.error) {
      apiErrors.push(aiResult.error);
      aiResult = null;
    }
  }

  if (!aiResult || !aiResult.text) {
    return res.status(200).json({
      heats: null,
      error: 'AI 搜索服务暂时不可用',
      apiErrors,
      hint: process.env.GEMINI_API_KEY
        ? 'Gemini API 和 Pollinations 均失败，请稍后重试'
        : '未配置 GEMINI_API_KEY。建议在 Vercel 项目 Settings → Environment Variables 中添加 GEMINI_API_KEY（从 https://aistudio.google.com/app/apikey 免费获取），可获得更稳定的搜索体验。当前使用免费 Pollinations.ai 作为备选。'
    });
  }

  // 解析 AI 回复中的州排名
  const rankings = extractStateRankings(aiResult.text);

  if (rankings.length < 3) {
    return res.status(200).json({
      heats: null,
      error: `AI 回复中未能提取到足够的州排名数据（仅找到 ${rankings.length} 个州）`,
      rawTextPreview: aiResult.text.substring(0, 500),
      apiErrors
    });
  }

  // 计算区域热度
  const { heats, regionScores, regionCounts } = calculateRegionHeat(rankings);

  // 构建州排名详情
  const stateDetails = rankings.slice(0, 15).map((r, i) => ({
    state: r.state.charAt(0).toUpperCase() + r.state.slice(1),
    rank: i + 1,
    region: STATE_TO_REGION[r.state] || 'Unknown',
    score: r.score
  }));

  // 各区域汇总
  const regionDetails = {};
  for (const region of ['Northeast', 'Midwest', 'South', 'West']) {
    const statesInRegion = stateDetails.filter(s => s.region === region);
    regionDetails[region] = {
      heat: heats[region],
      totalScore: regionScores[region],
      stateCount: regionCounts[region],
      states: statesInRegion.map(s => `${s.state} (#${s.rank}, ${s.score})`)
    };
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({
    heats,
    source: aiResult.source,
    keyword: kw,
    details: {
      method: 'AI 分析：LLM 基于消费者市场数据评估各州需求 → 提取州排名 → 四大区域热度汇总',
      totalStates: rankings.length,
      stateRankings: stateDetails,
      regionDetails: regionDetails,
      aiResponseLength: aiResult.text.length,
      geminiEnabled: !!process.env.GEMINI_API_KEY
    },
    apiErrors: apiErrors.length > 0 ? apiErrors : undefined
  });
}
