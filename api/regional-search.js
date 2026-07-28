// 区域热度对比搜索 — 基于 Google Suggest 的区域对比方案
// 原理：对每个州的代表城市，查询 Google Suggest「keyword + city」，
// 统计返回建议中同时包含关键词和城市名的数量，作为区域搜索热度信号
// 当 Google Trends 不可用时，这是最可靠的真实区域热度替代方案

const REGION_STATES = {
  West: ['California', 'Washington', 'Oregon', 'Arizona', 'Nevada', 'Colorado', 'Utah'],
  South: ['Texas', 'Florida', 'Georgia', 'Virginia', 'North Carolina', 'Tennessee', 'Maryland'],
  Northeast: ['New York', 'New Jersey', 'Pennsylvania', 'Massachusetts', 'Connecticut', 'Maine'],
  Midwest: ['Illinois', 'Michigan', 'Ohio', 'Minnesota', 'Wisconsin', 'Missouri', 'Indiana']
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  const { keyword } = req.query;
  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword parameter' });
  }

  try {
    const kw = keyword.toLowerCase().trim();

    // 构建所有查询：keyword + state
    const allQueries = [];
    for (const [region, states] of Object.entries(REGION_STATES)) {
      for (const state of states) {
        allQueries.push({ region, state, query: `${keyword} ${state}` });
      }
    }

    // 并行请求所有 Google Suggest 查询（一次发完，利用网络并发）
    const results = await Promise.all(allQueries.map(async ({ region, state, query }) => {
      try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
        const resp = await fetch(url, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) return { region, state, count: 0, relevant: 0 };

        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch { return { region, state, count: 0, relevant: 0 }; }

        const suggestions = (data[1] || []).map(s => String(s).toLowerCase());
        // 统计同时包含关键词和州名的建议数量
        const stateLower = state.toLowerCase();
        const relevant = suggestions.filter(s =>
          s.includes(kw) && s.includes(stateLower)
        ).length;

        return { region, state, count: suggestions.length, relevant };
      } catch {
        return { region, state, count: 0, relevant: 0 };
      }
    }));

    // 按区域汇总
    const regionStats = {};
    for (const r of results) {
      if (!regionStats[r.region]) {
        regionStats[r.region] = { totalRelevant: 0, totalSuggestions: 0, stateCount: 0, statesWithData: 0 };
      }
      regionStats[r.region].totalRelevant += r.relevant;
      regionStats[r.region].totalSuggestions += r.count;
      regionStats[r.region].stateCount++;
      if (r.count > 0) regionStats[r.region].statesWithData++;
    }

    // 计算区域热度分值：用「相关建议总数」作为区域热度指标
    // 因为不同州的查询返回的建议数差异不大，关键差异在于建议中包含州名的比例
    const heats = {};
    let maxScore = 0;
    for (const [region, stats] of Object.entries(regionStats)) {
      // 分值 = 相关建议总数（州名+关键词同时出现的建议数）
      const score = stats.totalRelevant;
      heats[region] = score;
      if (score > maxScore) maxScore = score;
    }

    // 归一化到 0-100
    if (maxScore > 0) {
      for (const r of Object.keys(heats)) {
        heats[r] = Math.round((heats[r] / maxScore) * 100);
      }
    } else {
      // 如果所有区域相关建议都为0，用建议总数作为备选信号
      let maxTotal = 0;
      for (const [region, stats] of Object.entries(regionStats)) {
        heats[region] = stats.totalSuggestions;
        if (stats.totalSuggestions > maxTotal) maxTotal = stats.totalSuggestions;
      }
      if (maxTotal > 0) {
        for (const r of Object.keys(heats)) {
          heats[r] = Math.round((heats[r] / maxTotal) * 100);
        }
      }
    }

    // 检查是否有实际数据返回
    const totalRelevant = results.reduce((sum, r) => sum + r.relevant, 0);
    const totalSuggestions = results.reduce((sum, r) => sum + r.count, 0);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      heats,
      source: 'Google Suggest Regional Comparison',
      details: {
        totalQueries: results.length,
        totalSuggestions,
        totalRelevant,
        regionStats,
        perState: results
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal server error in regional-search proxy',
      message: err.message
    });
  }
}
