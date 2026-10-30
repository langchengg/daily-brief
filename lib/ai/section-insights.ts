import { jsonrepair } from "jsonrepair";
import { runLlm } from "./llm";
import { extractJson } from "./json-util";
import { REPORT_LOCALE } from "../sources/registry";
import type { Category } from "../sources/types";
import type { ArticleInput } from "./pipeline";

/**
 * Per-section actionable profit insights — a short paragraph per category
 * highlighting investment / startup / arbitrage opportunities the reader
 * can act on, generated from enriched article titles + summaries.
 */
export type SectionInsights = Record<Category, string>;

const SYSTEM_PROMPT_ZH = `你是一名资深投资分析师兼创业顾问。你的任务是针对每个新闻板块，生成一段 **80-150 字的「赚钱洞察」**。

要求：
1. **以赚钱为核心导向** — 每段总结必须聚焦于：可以利用的投资机会、创业/产品灵感、套利空间、行业趋势带来的潜在收益。
2. **具体可操作** — 不要泛泛而谈，要给出具体的行动方向（关注哪个标的/赛道/技术/政策红利）。
3. **标注风险** — 如果有明显风险，用一句话简要提示。
4. **中文输出**。
5. 如果某个板块没有明显的赚钱信号，诚实说明「今日该板块无明显可操作机会」。

输出严格为 JSON：
{
  "tech": "技术板块赚钱洞察...",
  "finance": "财经板块赚钱洞察...",
  "politics": "时政板块赚钱洞察...",
  "robotics": "机器人板块赚钱洞察..."
}

规则：合法 JSON，不要 markdown 包裹，不要前后缀解释。`;

const SYSTEM_PROMPT_EN = `You are a seasoned investment analyst and startup advisor. For each news section, generate an **80-150 word "Profit Insight"**.

Requirements:
1. **Profit-oriented** — each paragraph must focus on: actionable investment opportunities, startup/product ideas, arbitrage potential, or sector trends that can generate returns.
2. **Specific and actionable** — name tickers, sectors, technologies, or policy tailwinds worth watching.
3. **Flag risks** — one sentence risk note if applicable.
4. **English output only**.
5. If a section has no clear money-making signal, honestly state "No obvious actionable opportunity today."

Output strict JSON:
{
  "tech": "Tech profit insight...",
  "finance": "Finance profit insight...",
  "politics": "Politics profit insight...",
  "robotics": "Robotics profit insight..."
}

Rules: valid JSON only, no markdown wrapping, no prefix/suffix prose.`;

const SYSTEM_PROMPT =
  REPORT_LOCALE === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;

/**
 * Generate per-section profit-oriented insights from the day's articles.
 * Uses a single LLM call with compact article summaries as input.
 */
export async function generateSectionInsights(
  articles: ArticleInput[],
): Promise<SectionInsights> {
  // Build compact per-category summaries for the LLM
  const byCategory: Record<Category, { title: string; summary?: string }[]> = {
    tech: [],
    finance: [],
    politics: [],
    robotics: [],
  };

  for (const a of articles) {
    const bucket = byCategory[a.category];
    if (!bucket) continue;
    // Keep max 10 per category to stay within token budget
    if (bucket.length >= 10) continue;
    bucket.push({
      title: a.title,
      summary: a.summary ?? a.excerpt?.slice(0, 80),
    });
  }

  const userPayload = Object.fromEntries(
    (Object.keys(byCategory) as Category[]).map((cat) => [
      cat,
      byCategory[cat].map((a) => ({
        title: a.title,
        summary: a.summary ?? "",
      })),
    ]),
  );

  const userPrompt =
    REPORT_LOCALE === "en"
      ? [
          "Analyze the following news by section and generate profit insights.",
          "",
          "News data (JSON):",
          JSON.stringify(userPayload),
        ].join("\n")
      : [
          "分析以下各板块新闻，生成赚钱洞察。",
          "",
          "新闻数据（JSON）：",
          JSON.stringify(userPayload),
        ].join("\n");

  const { text } = await runLlm({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  });

  const cleaned = extractJson(text);
  let parsed: Partial<SectionInsights>;
  try {
    parsed = JSON.parse(cleaned) as Partial<SectionInsights>;
  } catch {
    try {
      const repaired = jsonrepair(cleaned);
      parsed = JSON.parse(repaired) as Partial<SectionInsights>;
      console.warn("[section-insights] JSON.parse failed but jsonrepair recovered");
    } catch {
      console.warn("[section-insights] failed to parse LLM response, using empty insights");
      parsed = {};
    }
  }

  return {
    tech: parsed.tech ?? "",
    finance: parsed.finance ?? "",
    politics: parsed.politics ?? "",
    robotics: parsed.robotics ?? "",
  };
}
