// v11 产品热度搜索 — Reddit 本地社区搜索
// 核心改进：在本地城市/州 subreddit 中搜索关键词，直接获取地理热度信号
// 地理信号来自帖子所在社区（哪个城市/州的 subreddit），不依赖文本中是否提到州名
// 数据源：Reddit JSON API（免费、无需 API Key、不封锁 Vercel IP）
// 不依赖任何代理服务，不调用 Google/Bing/DuckDuckGo HTML 搜索

const REDDIT_UA = 'ProductHeatMap/1.0 (product market research; +https://gc-croundcalculatorv3.vercel.app)';

// 各区域本地 subreddit（城市/州级别社区，每个区域8-10个）
const REGION_SUBREDDITS = {
  'Northeast': [
    { sub: 'newyork', label: 'New York' },
    { sub: 'nyc', label: 'New York City' },
    { sub: 'boston', label: 'Boston, MA' },
    { sub: 'philadelphia', label: 'Philadelphia, PA' },
    { sub: 'newjersey', label: 'New Jersey' },
    { sub: 'pittsburgh', label: 'Pittsburgh, PA' },
    { sub: 'connecticut', label: 'Connecticut' },
    { sub: 'massachusetts', label: 'Massachusetts' },
    { sub: 'rhodeisland', label: 'Rhode Island' },
    { sub: 'maine', label: 'Maine' }
  ],
  'Midwest': [
    { sub: 'chicago', label: 'Chicago, IL' },
    { sub: 'detroit', label: 'Detroit, MI' },
    { sub: 'columbus', label: 'Columbus, OH' },
    { sub: 'minneapolis', label: 'Minneapolis, MN' },
    { sub: 'cleveland', label: 'Cleveland, OH' },
    { sub: 'cincinnati', label: 'Cincinnati, OH' },
    { sub: 'milwaukee', label: 'Milwaukee, WI' },
    { sub: 'indianapolis', label: 'Indianapolis, IN' },
    { sub: 'stlouis', label: 'St. Louis, MO' },
    { sub: 'iowa', label: 'Iowa' }
  ],
  'South': [
    { sub: 'texas', label: 'Texas' },
    { sub: 'houston', label: 'Houston, TX' },
    { sub: 'dallas', label: 'Dallas, TX' },
    { sub: 'florida', label: 'Florida' },
    { sub: 'miami', label: 'Miami, FL' },
    { sub: 'atlanta', label: 'Atlanta, GA' },
    { sub: 'charlotte', label: 'Charlotte, NC' },
    { sub: 'nashville', label: 'Nashville, TN' },
    { sub: 'austin', label: 'Austin, TX' },
    { sub: 'tampa', label: 'Tampa, FL' }
  ],
  'West': [
    { sub: 'california', label: 'California' },
    { sub: 'losangeles', label: 'Los Angeles, CA' },
    { sub: 'sanfrancisco', label: 'San Francisco, CA' },
    { sub: 'seattle', label: 'Seattle, WA' },
    { sub: 'portland', label: 'Portland, OR' },
    { sub: 'denver', label: 'Denver, CO' },
    { sub: 'phoenix', label: 'Phoenix, AZ' },
    { sub: 'sandiego', label: 'San Diego, CA' },
    { sub: 'lasvegas', label: 'Las Vegas, NV' },
    { sub: 'saltlakecity', label: 'Salt Lake City, UT' }
  ]
};

// 美国州名 → 区域映射（用于补充信号：从广泛搜索的文本中提取州名提及）
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

const CITY_TO_STATE = {
  'new york city':'new york','nyc':'new york','los angeles':'california','chicago':'illinois',
  'houston':'texas','phoenix':'arizona','philadelphia':'pennsylvania','san antonio':'texas',
  'san diego':'california','dallas':'texas','san jose':'california','austin':'texas',
  'jacksonville':'florida','fort worth':'texas','columbus':'ohio','charlotte':'north carolina',
  'san francisco':'california','indianapolis':'indiana','seattle':'washington','denver':'colorado',
  'boston':'massachusetts','el paso':'texas','nashville':'tennessee','detroit':'michigan',
  'oklahoma city':'oklahoma','portland':'oregon','las vegas':'nevada','memphis':'tennessee',
  'louisville':'kentucky','baltimore':'maryland','milwaukee':'wisconsin','albuquerque':'new mexico',
  'tucson':'arizona','fresno':'california','sacramento':'california','kansas city':'missouri',
  'miami':'florida','atlanta':'georgia','new orleans':'louisiana','minneapolis':'minnesota',
  'tampa':'florida','orlando':'florida','pittsburgh':'pennsylvania','cincinnati':'ohio',
  'salt lake city':'utah','honolulu':'hawaii','boise':'idaho'
};

// ===== 核心：Reddit 本地 subreddit 搜索 =====
// 在指定 subreddit 内搜索关键词，返回帖子数、总分、评论数
async function searchSubreddit(keyword, subInfo) {
  const url = `https://www.reddit.com/r/${subInfo.sub}/search.json?q=${encodeURIComponent(keyword)}&restrict_sr=1&limit=25&sort=relevance&t=all`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': REDDIT_UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      return { sub: subInfo.sub, label: subInfo.label, postCount: 0, totalScore: 0, totalComments: 0, error: `HTTP ${resp.status}` };
    }
    const data = await resp.json();
    const posts = (data?.data?.children || []).map(c => c.data).filter(Boolean);
    let totalScore = 0;
    let totalComments = 0;
    let text = '';
    for (const d of posts) {
      totalScore += (d.score || 0);
      totalComments += (d.num_comments || 0);
      text += ' ' + (d.title || '') + ' ' + (d.selftext || '');
    }
    return {
      sub: subInfo.sub,
      label: subInfo.label,
      postCount: posts.length,
      totalScore,
      totalComments,
      text
    };
  } catch (err) {
    return { sub: subInfo.sub, label: subInfo.label, postCount: 0, totalScore: 0, totalComments: 0, error: err.message };
  }
}

// ===== 补充：Reddit 广泛搜索 + 文本分析 =====
async function searchRedditBroad(keyword) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&limit=100&sort=relevance&t=all`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': REDDIT_UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) throw new Error(`Reddit HTTP ${resp.status}`);
    const data = await resp.json();
    const posts = (data?.data?.children || []).map(c => c.data).filter(Boolean);
    let text = '';
    for (const d of posts) {
      text += ' ' + (d.title || '') + ' ' + (d.selftext || '') + ' ' + (d.subreddit_name || d.subreddit || '');
    }
    return { text, postCount: posts.length };
  } catch (err) {
    return { text: '', postCount: 0, error: err.message };
  }
}

// 从文本中统计州名提及（补充信号）
function countStateMentions(text) {
  const textLower = text.toLowerCase();
  const regionScores = { 'Northeast': 0, 'Midwest': 0, 'South': 0, 'West': 0 };

  for (const [stateName, region] of Object.entries(STATE_TO_REGION)) {
    const escaped = stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'g');
    const matches = (textLower.match(regex) || []).length;
    if (matches > 0) regionScores[region] += matches;
  }

  for (const [cityName, stateName] of Object.entries(CITY_TO_STATE)) {
    const escaped = cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'g');
    const matches = (textLower.match(regex) || []).length;
    if (matches > 0) {
      const region = STATE_TO_REGION[stateName];
      if (region) regionScores[region] += matches;
    }
  }

  return regionScores;
}

export default async function handler(req, res) {
  const { keyword } = req.query;
  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword parameter' });
  }

  const kw = keyword.toLowerCase().trim();
  const sourceDetails = [];
  const apiErrors = [];

  // ===== 主数据源：Reddit 本地社区搜索 =====
  // 在 4 大区域各 10 个本地 subreddit 中搜索关键词
  // 地理信号直接来自帖子所在社区，不依赖文本中是否提到州名
  const regionResults = {
    'Northeast': { subreddits: [], totalPosts: 0, totalScore: 0, totalComments: 0, successCount: 0 },
    'Midwest': { subreddits: [], totalPosts: 0, totalScore: 0, totalComments: 0, successCount: 0 },
    'South': { subreddits: [], totalPosts: 0, totalScore: 0, totalComments: 0, successCount: 0 },
    'West': { subreddits: [], totalPosts: 0, totalScore: 0, totalComments: 0, successCount: 0 }
  };

  // 收集所有 subreddit 搜索任务
  const allTasks = [];
  for (const [region, subs] of Object.entries(REGION_SUBREDDITS)) {
    for (const subInfo of subs) {
      allTasks.push({ region, subInfo });
    }
  }

  // 分批并行搜索（每批 5 个，避免 Reddit 速率限制 60 次/分钟）
  const BATCH = 5;
  for (let i = 0; i < allTasks.length; i += BATCH) {
    const batch = allTasks.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(task => searchSubreddit(kw, task.subInfo).then(r => ({ ...r, region: task.region })))
    );
    for (const r of results) {
      regionResults[r.region].subreddits.push(r);
      if (!r.error) {
        regionResults[r.region].successCount++;
        regionResults[r.region].totalPosts += r.postCount;
        regionResults[r.region].totalScore += r.totalScore;
        regionResults[r.region].totalComments += r.totalComments;
      }
    }
  }

  // 汇总各区域得分
  // 得分 = 帖子数 × 3 + 总点赞数 × 0.5 + 总评论数 × 1
  // 帖子数量是核心信号（表示有多少人在该地区讨论这个产品）
  // 点赞和评论作为互动量补充
  const regionScores = {};
  for (const [region, data] of Object.entries(regionResults)) {
    regionScores[region] = data.totalPosts * 3 + data.totalScore * 0.5 + data.totalComments * 1;
  }

  sourceDetails.push(`Reddit 本地社区搜索: 40 个城市/州 subreddit，覆盖 4 大区域`);

  // ===== 补充数据源：Reddit 广泛搜索 + 文本分析 =====
  const broadResult = await searchRedditBroad(kw);
  let textMentions = { 'Northeast': 0, 'Midwest': 0, 'South': 0, 'West': 0 };
  if (broadResult.text.length > 50) {
    textMentions = countStateMentions(broadResult.text);
    sourceDetails.push(`Reddit 广泛搜索: ${broadResult.postCount} 篇帖子，${broadResult.text.length} 字符文本，提取州名提及作为补充信号`);
    // 文本提及作为补充信号（权重较低，避免覆盖本地社区搜索的主信号）
    for (const region of Object.keys(regionScores)) {
      regionScores[region] += textMentions[region] * 2;
    }
  } else {
    if (broadResult.error) apiErrors.push(`Reddit 广泛搜索: ${broadResult.error}`);
  }

  // 检查是否有有效数据
  const totalScore = Object.values(regionScores).reduce((a, b) => a + b, 0);
  const successfulSubs = Object.values(regionResults).reduce((sum, r) => sum + r.successCount, 0);

  if (totalScore < 1 && successfulSubs === 0) {
    return res.status(200).json({
      heats: null,
      error: 'Reddit API 全部失败（可能被限流），请稍后重试',
      sourceDetails,
      apiErrors,
      regionResults
    });
  }

  if (totalScore < 1) {
    return res.status(200).json({
      heats: null,
      error: `关键词「${keyword}」在所有本地社区中均未找到讨论帖子，可能该产品关键词过于冷门或不常在 Reddit 讨论`,
      sourceDetails,
      apiErrors,
      regionResults,
      successfulSubs
    });
  }

  // 归一化到 0-100
  const maxScore = Math.max(...Object.values(regionScores), 0);
  const heats = {};
  for (const [region, score] of Object.entries(regionScores)) {
    heats[region] = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  // 构建详细信息
  const regionDetailList = [];
  for (const [region, data] of Object.entries(regionResults)) {
    const topSubs = data.subreddits
      .filter(s => s.postCount > 0)
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5)
      .map(s => `${s.label}(${s.postCount}帖/${s.totalScore}赞)`);

    regionDetailList.push({
      region,
      heat: heats[region],
      totalPosts: data.totalPosts,
      totalScore: data.totalScore,
      totalComments: data.totalComments,
      subredditCount: data.successCount,
      topSubreddits: topSubs
    });
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({
    heats,
    source: 'Reddit 本地社区搜索（40个城市/州 subreddit 热度统计 + 广泛搜索文本补充）',
    sourceDetails,
    details: {
      method: '在4大区域各10个本地城市/州subreddit中搜索关键词，统计帖子数+互动量作为区域热度信号',
      totalSubreddits: 40,
      successfulSubreddits: successfulSubs,
      regionDetails: regionDetailList,
      broadSearch: {
        postCount: broadResult.postCount,
        textMentions: textMentions,
        error: broadResult.error || null
      },
      scoring: '帖子数×3 + 点赞数×0.5 + 评论数×1 + 文本提及×2',
      topStates: regionDetailList
        .flatMap(r => r.topSubreddits.map(s => ({ sub: s, region: r.region })))
        .slice(0, 10)
    },
    apiErrors: apiErrors.length > 0 ? apiErrors : undefined
  });
}
