# 谷仓美国Ground运费分区地图与计算器 V3 — Vercel 部署版 v2

## v2 修复内容（搜索功能修复）

### 问题根因
1. **Google Trends API 路由未处理 consent cookie**：Google Trends API 要求先通过 consent 流程获取 NID cookie，否则返回 HTML 同意页面而非 JSON，导致解析失败
2. **所有 API 错误被前端静默吞掉**：`if (!resp.ok) return null` 和 `catch(e) { return null; }` 让用户永远看不到真实失败原因
3. **备用数据源无法提供区域热度**：DuckDuckGo Instant Answer 对产品关键词几乎返回空；Google Suggest 返回搜索建议而非区域数据；Wikipedia 页面浏览量无区域维度
4. **缺少区域对比替代方案**：Google Trends 失败后没有能提供"四大区域热度对比"的替代方案
5. **Vercel Hobby 计划 10s 超时**：Google Trends 两步请求可能超时

### 修复方案

**1. 修复 Google Trends API 路由 (`api/google-trends.js`)**
- 新增 Step 0：先访问 Google Trends 首页获取 cookie（绕过 consent 机制）
- 如果未获取到 cookie，手动设置 `CONSENT=YES+...` cookie
- 添加 Referer 头模拟浏览器行为
- 返回完整错误信息（HTTP 状态码 + 原因 hint）

**2. 新增区域对比搜索路由 (`api/regional-search.js`)**
- Google Trends 不可用时的首选替代方案
- 对 4 大区域 26 个代表州并行查询 Google Suggest「keyword + 州名」
- 统计返回建议中同时包含关键词和州名的数量作为区域热度信号
- 26 个请求并行发送，总耗时约 1-3 秒

**3. 新增诊断端点 (`api/debug.js`)**
- 一键测试所有 5 个 API 路由的连通性
- 访问 `/api/debug?keyword=test` 即可查看各 API 的响应状态

**4. 前端改造 (`public/index.html`)**
- API 包装函数返回 `{data, error}` 而非静默 `null`
- 搜索流程改为三级递进：① Google Trends → ② Google Suggest 区域对比 → ③ 多源交叉验证
- 全部失败时展示各 API 的具体错误诊断信息
- 搜索结果中显示 Google Trends 失败原因

**5. Vercel 配置 (`vercel.json`)**
- 添加 `functions.maxDuration: 25` 提升 API 超时限制（Hobby 计划最大 25 秒）

## 部署方法

### 方式一：GitHub 导入（推荐）

1. 将 `vercel-fix` 目录内容上传到 GitHub 仓库
2. 打开 https://vercel.com → Add New Project → 选择该仓库 → Deploy
3. 1-2 分钟后获得在线地址

### 方式二：Vercel CLI

```bash
cd vercel-fix
vercel --prod
```

### 更新已有项目

如果已经部署到 Vercel，只需将本目录的文件覆盖到 GitHub 仓库并推送：
- 覆盖 `api/` 目录下的所有 `.js` 文件
- 新增 `api/regional-search.js` 和 `api/debug.js`
- 覆盖 `public/index.html`
- 覆盖 `vercel.json` 和 `package.json`
- 推送后 Vercel 自动重新部署

## 诊断方法

部署后，在浏览器地址栏访问以下地址测试各 API：

```
https://你的域名/api/debug?keyword=outdoor%20fire%20pit
```

返回 JSON 会显示每个 API 的状态码和响应内容，便于快速定位问题。

## 目录结构

```
vercel-fix/
├── api/
│   ├── google-trends.js      # Google Trends 代理（修复 cookie 处理）
│   ├── regional-search.js    # 新增：Google Suggest 区域对比
│   ├── duckduckgo.js         # DuckDuckGo 代理（改进错误处理）
│   ├── google-suggest.js     # Google Suggest 代理（改进错误处理）
│   ├── wikipedia.js          # Wikipedia 代理（改进错误处理）
│   └── debug.js              # 新增：诊断端点
├── public/
│   ├── index.html            # 主应用（三级搜索 + 错误诊断）
│   └── data/                 # 运费/仓储/Zone 数据文件
├── vercel.json               # Vercel 配置（含 maxDuration 25s）
└── package.json
```
