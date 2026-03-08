import type { AiReportType, AiChatTask } from '@remote-care/shared';

interface RecipientContext {
  name: string;
  age: number | null;
  medical_tags: string[];
}

interface MeasurementSummary {
  type: string;
  count: number;
  abnormal_count: number;
  latest_values: string[];
  period: string;
}

export interface PromptContext {
  recipient: RecipientContext;
  measurements: MeasurementSummary[];
}

const SYSTEM_RULES = `你是一位台灣健康數據摘要助理。
嚴格規則：
- 不可提及任何藥物名稱或劑量
- 不可做出診斷性陳述（如「您患有XXX疾病」）
- 不可建議處方或治療方案
- 不可提供緊急醫療建議
- 不可做出心理健康診斷
- 所有建議必須以「建議諮詢醫師」作為最終指引
- 回覆必須使用繁體中文
- 回覆必須是有效的 JSON 格式`;

function formatMeasurementContext(measurements: MeasurementSummary[]): string {
  if (measurements.length === 0) return '目前無量測資料。';
  return measurements
    .map((m) => {
      const typeLabel = m.type === 'blood_pressure' ? '血壓' : '血糖';
      return `${typeLabel}：共 ${m.count} 筆（異常 ${m.abnormal_count} 筆），最近數值：${m.latest_values.join('、')}，期間：${m.period}`;
    })
    .join('\n');
}

// ─── Report Prompts ───────────────────────────────────────────

const REPORT_PROMPTS: Record<AiReportType, (ctx: PromptContext) => string> = {
  health_summary: (ctx) => `請根據以下被照護者的健康資料，產生一份健康摘要報告。

被照護者：${ctx.recipient.name}${ctx.recipient.age ? `，${ctx.recipient.age} 歲` : ''}
醫療標籤：${ctx.recipient.medical_tags.length > 0 ? ctx.recipient.medical_tags.join('、') : '無'}

量測資料：
${formatMeasurementContext(ctx.measurements)}

請以 JSON 格式回覆，包含以下欄位：
- status_label: "stable"（穩定）、"attention"（需注意）或 "consult_doctor"（建議就醫）
- summary: 簡短健康摘要（最多100字）
- reasons: 判斷原因陣列（1-5項，每項最多200字）
- suggestions: 建議陣列（1-5項，每項最多200字）`,

  trend_analysis: (ctx) => `請根據以下被照護者的量測趨勢，產生趨勢分析報告。

被照護者：${ctx.recipient.name}${ctx.recipient.age ? `，${ctx.recipient.age} 歲` : ''}
醫療標籤：${ctx.recipient.medical_tags.length > 0 ? ctx.recipient.medical_tags.join('、') : '無'}

量測資料：
${formatMeasurementContext(ctx.measurements)}

請以 JSON 格式回覆，包含以下欄位：
- trend_direction: "improving"（改善中）、"stable"（穩定）或 "worsening"（惡化中）
- explanation: 趨勢說明（最多300字）
- key_observations: 關鍵觀察陣列（1-5項）
- suggestions: 建議陣列（1-5項）`,

  visit_prep: (ctx) => `請根據以下被照護者的健康資料，產生看診準備建議。

被照護者：${ctx.recipient.name}${ctx.recipient.age ? `，${ctx.recipient.age} 歲` : ''}
醫療標籤：${ctx.recipient.medical_tags.length > 0 ? ctx.recipient.medical_tags.join('、') : '無'}

量測資料：
${formatMeasurementContext(ctx.measurements)}

請以 JSON 格式回覆，包含以下欄位：
- questions: 建議詢問醫師的問題陣列（1-10項），每項包含 category（類別）和 question（問題）
- data_to_bring: 看診時應攜帶的資料陣列（1-5項）
- notes: 其他注意事項（最多300字）`,

  family_update: (ctx) => `請根據以下被照護者的健康資料，產生一份適合傳給家人的健康近況摘要。

被照護者：${ctx.recipient.name}${ctx.recipient.age ? `，${ctx.recipient.age} 歲` : ''}
醫療標籤：${ctx.recipient.medical_tags.length > 0 ? ctx.recipient.medical_tags.join('、') : '無'}

量測資料：
${formatMeasurementContext(ctx.measurements)}

請以 JSON 格式回覆，包含以下欄位：
- greeting: 問候語（最多50字）
- health_update: 健康近況說明（最多300字）
- highlights: 重點摘要陣列（1-5項）
- closing: 結尾語（最多100字）`,
};

// ─── Chat Prompts ─────────────────────────────────────────────

const CHAT_PROMPTS: Record<AiChatTask, (ctx: PromptContext) => string> = {
  trend_explanation: (ctx) => `請根據以下量測資料，簡要解釋近期健康趨勢。

被照護者：${ctx.recipient.name}
量測資料：
${formatMeasurementContext(ctx.measurements)}

請以 JSON 格式回覆，包含：
- explanation: 趨勢說明（最多500字）
- key_points: 重點摘要陣列（1-5項）`,

  family_update: (ctx) => `請產生一段適合傳給家人的近況訊息。

被照護者：${ctx.recipient.name}
量測資料：
${formatMeasurementContext(ctx.measurements)}

請以 JSON 格式回覆，包含：
- message: 給家人的訊息（最多500字）
- highlights: 重點摘要陣列（1-5項）`,

  visit_questions: (ctx) => `請根據近期健康資料，建議看診時可詢問的問題。

被照護者：${ctx.recipient.name}
量測資料：
${formatMeasurementContext(ctx.measurements)}

請以 JSON 格式回覆，包含：
- questions: 建議問題陣列（1-10項）
- reminders: 看診提醒陣列（1-5項）`,
};

export function buildReportPrompt(type: AiReportType, ctx: PromptContext): { system: string; user: string } {
  return { system: SYSTEM_RULES, user: REPORT_PROMPTS[type](ctx) };
}

export function buildChatPrompt(task: AiChatTask, ctx: PromptContext): { system: string; user: string } {
  return { system: SYSTEM_RULES, user: CHAT_PROMPTS[task](ctx) };
}
