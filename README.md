<a id="zh"></a>

# 📰 daily-brief · 你的个人 AI 商业与科技每日简报

**中文** · [English ↓](#en)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![LLM: pluggable](https://img.shields.io/badge/LLM-pluggable%20(6%20backends)-orange.svg)](#-llm-后端配置)
[![Repo](https://img.shields.io/badge/repo-langchengg%2Fdaily--brief-blue.svg)](https://github.com/langchengg/daily-brief)

> **你的私人 AI 每日早报，跑在你自己掌控的基础设施上。** 
> 聚合 28+ 顶级数据源 · 🤖 机器人前沿专属板块 · 🦄 Product Hunt 30 款新品五维商业拆解 · 💰 各板块商业/变现洞察 · 📈 21 个标的技术指标与 AI 交易点评 · 📬 手机邮件/Telegram 自动推送 · 跨国自适应时区。

---

## ✨ 独家新增与核心特性

- 🤖 **机器人行业专属板块 (Robotics Sector)**：
  - 深度追踪全球前沿具身智能与机器人动态：The Robot Report、IEEE Spectrum Robotics、Robohub。
  - 独立一级板块与结构化中英双语摘要，紧跟前沿工业机器人与具身智能进展。
- 💰 **各板块「赚钱洞察」 (Section Profit Insights)**：
  - 在每一个板块（技术动态、市场行情、国际时政、机器人前沿）末尾，由 AI 深度提炼**对商业盈利、投资决策、副业探索最有价值的信息**，寻找可落地的机会点。
  - 专属高亮金色卡片呈现。
- 🦄 **Product Hunt 深度集成与商业拆解**：
  - 专属定制 Atom 解析引擎，精准提取每款产品的真实标语（Tagline），告别无效模板文字。
  - 每日 Top 30 新品 100% 覆盖，AI 提炼 5 维商业结构化透视：**服务场景、目标用户、解决的问题、一句话核心价值、潜在用户反馈倾向**。
- 📬 **多渠道自动通知推送 (Email & Telegram)**：
  - **邮件推送 (Gmail / SMTP)**：每日生成完简报后，自动发送精美 HTML 邮件到手机，内含精炼概览、赚钱洞察，并附赠当天完整的独立单文件 HTML 简报附件。
  - **Telegram Bot 推送**：支持配置机器人 Token 与 Chat ID 自动通知。
  - 独立测试命令：`npm run notify`。
- 🌍 **智能跨时区自适应 (Smart Timezone Detection)**：
  - 专为经常跨国出行的用户设计（如往返于中国 CST 与英国 GMT/BST），无需手动切换代码，自适应跟随本地时间或通过 `REPORT_TZ` 指定。
- 📈 **21 个标的实时行情与 AI 点评**：美股 / 加密货币 / 港股 / 商品外汇 / 宏观信号，附 SMA / RSI / MACD 技术指标 + AI 每日交易态度（偏上行/偏下行/中性）。
- 🤖 **6 个 LLM 后端可插拔**：DeepSeek（推荐，便宜大碗且中文表现优异）/ Claude CLI / Anthropic / OpenAI / MiniMax / Zhipu，环境变量一键切换。
- 📁 **精美单文件 HTML**：CSS + JS 全内联，离线可用，开箱即看。

---

## 📚 信源图谱

当前默认启用 28+ 个高质量源，涵盖：

### 🧑‍💻 技术动态
- **GitHub Trending**：每日热门开源项目精选
- **Product Hunt**：每日 30 款新产品 5 维商业拆解（场景/用户/痛点/价值/反馈）
- **AI 顶级媒体**：OpenAI / DeepMind / Hugging Face Blog / TLDR AI / Smol AI / Latent Space / MIT Tech Review
- **X 精选推文**（attentionvc-ai）：精选海外 AI 大佬动态

### 🤖 机器人前沿（独家新增）
- **The Robot Report**：工业机器人与前沿商业落地
- **IEEE Spectrum Robotics**：学术与前沿工程技术创新
- **Robohub**：全球机器人学术与生态动态

### 📈 市场行情（21 个标的实时指标 + AI 点评）
- **美股 / ETF**：SPY / QQQ / AAPL / MSFT / NVDA / GOOGL / TSLA / META
- **加密资产**：BTC / ETH / SOL（附 alt.me 恐慌贪婪指数 + CoinGecko 宏观）
- **中概港股**：BABA / PDD / JD / 0700.HK
- **商品外汇**：GC=F（黄金）/ CL=F（WTI 原油）/ USDCNY=X
- **宏观信号**：^VIX / ^TNX（10Y 美债）/ DXY（美元指数）

### 🌍 时政观察
- **BBC / Guardian / NYT / NPR / DW 中文 / Al Jazeera / The Diplomat** — 7 大主流国际媒体

### 💰 财经要点
- **Bloomberg / WSJ / FT / BBC Business / Economist** — 全球核心财经媒体

### 💬 社区热议
- **zh 模式**：V2EX 热榜 / LinuxDo 热帖
- **en 模式**：Hacker News / Reddit r/stocks

---

## 🛠️ 日常命令

| 命令 | 用途 | 耗时 |
|---|---|---|
| `npm run daily` | 完整执行管线（抓取 28+ 源 → AI 摘要与洞察 → 行情分析 → 生成 HTML） | 3-5 min |
| `npm run notify [date]` | 发送指定日期（默认今日）的邮件 / Telegram 推送 | ~5s |
| `npm run open` | 在默认浏览器中直接打开今日生成的报告 | 即时 |
| `npm run dry-run` | 仅验证抓取网络连通性，不消耗 LLM token | ~30s |
| `npm run render [date]` | 调整模板或 CSS 后快速重新渲染 HTML | <1s |
| `npm run regen-trading [date]` | 单独重新计算市场行情与交易点评 | ~1 min |
| `npm run regen-enrich <cat:sub>`| 单独重跑某个子板块的中文摘要 | ~30s |
| `npm run sources` | 查看全部已注册源及其当前启用/过滤状态 | 即时 |

---

## ⚙️ 配置与环境变量 (`.env.local`)

在项目根目录创建 `.env.local` 即可完成全部配置：

```bash
# ==========================================
# 1. LLM 后端（推荐 DeepSeek）
# ==========================================
LLM_BACKEND=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key
LLM_MODEL=deepseek-chat

# ==========================================
# 2. 报告时区（留空则自动跟随系统，或显式指定）
# ==========================================
REPORT_TZ=Europe/London  # 或 Asia/Shanghai

# ==========================================
# 3. 邮件自动推送（Gmail SMTP 示例）
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
NOTIFY_EMAIL_TO=your_email@gmail.com

# ==========================================
# 4. Telegram 推送（可选）
# ==========================================
# TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
# TELEGRAM_CHAT_ID=123456789
```

---

## 🚀 部署与运行

### 方式 A：服务器部署（Ubuntu / Debian）

可直接查看配套的部署指引：[`server_deployment_prompt.md`](server_deployment_prompt.md)。

简易步骤：
```bash
# 1. 克隆并安装
git clone https://github.com/langchengg/daily-brief.git /opt/daily-brief
cd /opt/daily-brief
npm install

# 2. 写入 .env.local 配置
cp .env.example .env.local # 并填入实际 Key

# 3. 配置 Crontab 定时运行（每天早 8 点英国时间执行并推送）
crontab -e
# 添加：
0 8 * * * cd /opt/daily-brief && npm run daily && npm run notify >> /opt/daily-brief/logs/cron.log 2>&1
```

### 方式 B：本地 macOS / Linux

```bash
# 1. 安装依赖
npm install

# 2. 立即测试运行一次
npm run daily

# 3. 测试手机推送
npm run notify
```

### 方式 C：GitHub Actions 生成并发送邮件

`npm run daily` 只生成报告，发送邮件需要再执行 `npm run notify`。
仓库的 `Daily Brief` 工作流会在发布报告后发送邮件；配置收件地址后启用：

1. 在仓库 **Settings → Secrets and variables → Actions → Secrets** 中添加
   `SMTP_USER`（发件 Gmail 地址）、`SMTP_PASS`（Gmail 应用密码）和
   `NOTIFY_EMAIL_TO`（收件地址）。不要将应用密码提交到代码或工作流文件。
2. 同一处配置所用 LLM 的 Secret，例如 `DEEPSEEK_API_KEY`；在 **Variables** 中设置
   `LLM_BACKEND=deepseek`、`REPORT_TZ=Europe/London`、`REPORT_HOUR=8`。
   工作流默认使用 `smtp.gmail.com:465`，其他邮件服务可设置 `SMTP_HOST` / `SMTP_PORT`。
3. 在 **Actions → Daily Brief → Run workflow** 手动验证一次。邮件发送步骤成功表示
   SMTP 服务接受了邮件；请在收件箱和垃圾邮件中确认实际到达。

云开发环境中的凭据不会自动复制到 GitHub Actions。仅支持 HTTP/HTTPS 出网的开发环境
无法直连 Gmail SMTP，需要在允许 SMTP 出网的运行器上执行通知。
通知配置缺失、认证失败或收件人被拒绝都会使通知命令失败，不会再显示为成功发送。

---

## 📁 核心架构

```
daily-brief/
├── lib/
│   ├── sources/
│   │   ├── producthunt.ts     # Product Hunt 专用 Atom Tagline 提取器
│   │   ├── dispatch.ts        # 源分发器
│   │   └── registry.ts        # 源注册表
│   ├── ai/
│   │   ├── enrich.ts          # PH 5 维商业分析 / GitHub / 论文摘要提示词
│   │   ├── section-insights.ts# 💰 全板块商业盈利洞察生成
│   │   ├── trading-commentary.ts # AI 行情交易点评
│   │   └── pipeline.ts        # AI 调度与报告结构定义
│   ├── notify/
│   │   ├── email.ts           # Gmail / SMTP 富文本邮件及 HTML 附件推送
│   │   ├── telegram.ts        # Telegram Bot 推送
│   │   └── index.ts           # 统一通知分发
│   ├── trading/               # 标的行情与技术指标计算
│   └── output/
│       └── render.ts          # 报告排版与交互 (含机器人板块与赚钱洞察样式)
├── scripts/
│   ├── daily.ts               # 抓取与生成主入口
│   └── notify.ts              # 独立通知触发脚本
├── sources.config.json        # 28+ 数据源统一配置清单
└── .env.local                 # 环境变量与凭证（本地保护）
```

---

<br>

<a id="en"></a>

# 📰 daily-brief · Your AI Commercial & Tech Daily Intelligence

[↑ 中文](#zh) · **English**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Repo](https://img.shields.io/badge/repo-langchengg%2Fdaily--brief-blue.svg)](https://github.com/langchengg/daily-brief)

> **Your private daily AI intelligence brief running on your own infrastructure.**
> 28+ top sources · 🤖 Dedicated Robotics sector · 🦄 30 Product Hunt launches with 5-dimension commercial teardowns · 💰 Money-making & commercial insights per section · 📈 21-ticker technicals + AI trading commentary · 📬 Email & Telegram push notifications · Smart cross-border timezone adaptation.

---

## ✨ Key Additions & Core Features

- 🤖 **Dedicated Robotics Sector**:
  - Global tracking of embodied AI and physical robotics breakthroughs: The Robot Report, IEEE Spectrum Robotics, and Robohub.
  - Dedicated primary tab and structured bilingual summaries.
- 💰 **Section Profit Insights (💰 赚钱洞察)**:
  - At the end of every category (Tech, Finance, World Politics, Robotics), AI extracts actionable commercial angles, monetization opportunities, and entrepreneurial takeaways.
  - Highlighted in custom gold cards.
- 🦄 **Product Hunt Deep Integration & Commercial Analysis**:
  - Custom Atom feed extractor that captures real product taglines instead of boilerplate HTML.
  - Full 30-product coverage with 5-point analysis: **use-case scenario, target audience, core problem solved, 1-line value proposition, and expected user sentiment**.
- 📬 **Automated Multi-Channel Notifications (Email & Telegram)**:
  - **Email (SMTP/Gmail)**: Automatically emails daily executive summaries and insights right to your phone, with the complete self-contained HTML report attached.
  - **Telegram Bot**: Push key updates and market sentiment directly to Telegram.
  - Test command: `npm run notify`.
- 🌍 **Smart Timezone Adaptation**:
  - Designed for frequent travelers (e.g. between China CST and UK GMT/BST) — follows system timezone automatically or explicit `REPORT_TZ`.
- 📈 **21 Live Market Tickers**:
  - Equities, Crypto, Commodities, FX, and macro signals with SMA / RSI / MACD indicators + AI trading bias.
- 🤖 **6 Swappable LLM Backends**: DeepSeek, Claude CLI, Anthropic, OpenAI, MiniMax, Zhipu.

---

## 🛠️ Daily Commands

| Command | Purpose | Duration |
|---|---|---|
| `npm run daily` | Full pipeline: fetch 28+ sources → AI summaries & insights → render report | 3-5 min |
| `npm run notify [date]` | Dispatch email & Telegram notifications for target date | ~5s |
| `npm run open` | Open today's HTML report in your browser | Instant |
| `npm run dry-run` | Fetch sources without making LLM calls | ~30s |
| `npm run render [date]` | Re-render HTML from cached JSON | <1s |
| `npm run sources` | Inspect all registered feeds and their status | Instant |

---

## 📝 License

MIT
