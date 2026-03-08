import { describe, it, expect } from 'vitest';
import {
  HealthReportCreateSchema,
  AiChatCreateSchema,
  AiReportListQuerySchema,
  HealthSummaryOutputSchema,
  TrendAnalysisOutputSchema,
  VisitPrepOutputSchema,
  FamilyUpdateOutputSchema,
  TrendExplanationOutputSchema,
  FamilyChatOutputSchema,
  VisitQuestionsOutputSchema,
  AI_DISCLAIMER,
} from '../index';

// ─── Request Schemas ──────────────────────────────────────────

describe('HealthReportCreateSchema', () => {
  it('should accept valid input', () => {
    const result = HealthReportCreateSchema.safeParse({
      recipient_id: '00000000-0000-4000-a000-000000000001',
      report_type: 'health_summary',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all report types', () => {
    for (const type of ['health_summary', 'trend_analysis', 'visit_prep', 'family_update']) {
      const result = HealthReportCreateSchema.safeParse({
        recipient_id: '00000000-0000-4000-a000-000000000001',
        report_type: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid recipient_id', () => {
    const result = HealthReportCreateSchema.safeParse({
      recipient_id: 'not-a-uuid',
      report_type: 'health_summary',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid report_type', () => {
    const result = HealthReportCreateSchema.safeParse({
      recipient_id: '00000000-0000-4000-a000-000000000001',
      report_type: 'invalid_type',
    });
    expect(result.success).toBe(false);
  });
});

describe('AiChatCreateSchema', () => {
  it('should accept valid input', () => {
    const result = AiChatCreateSchema.safeParse({
      recipient_id: '00000000-0000-4000-a000-000000000001',
      task: 'trend_explanation',
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional context', () => {
    const result = AiChatCreateSchema.safeParse({
      recipient_id: '00000000-0000-4000-a000-000000000001',
      task: 'family_update',
      context: { period: '7d' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid task', () => {
    const result = AiChatCreateSchema.safeParse({
      recipient_id: '00000000-0000-4000-a000-000000000001',
      task: 'invalid_task',
    });
    expect(result.success).toBe(false);
  });
});

describe('AiReportListQuerySchema', () => {
  it('should accept minimal input with defaults', () => {
    const result = AiReportListQuerySchema.safeParse({
      recipient_id: '00000000-0000-4000-a000-000000000001',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should coerce string page/limit to numbers', () => {
    const result = AiReportListQuerySchema.safeParse({
      recipient_id: '00000000-0000-4000-a000-000000000001',
      page: '2',
      limit: '10',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it('should reject limit > 100', () => {
    const result = AiReportListQuerySchema.safeParse({
      recipient_id: '00000000-0000-4000-a000-000000000001',
      limit: '200',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Report Output Schemas ────────────────────────────────────

describe('HealthSummaryOutputSchema', () => {
  it('should accept valid output', () => {
    const result = HealthSummaryOutputSchema.safeParse({
      status_label: 'stable',
      summary: '整體健康狀況穩定',
      reasons: ['血壓正常', '血糖穩定'],
      suggestions: ['持續定時量測', '維持均衡飲食'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty summary', () => {
    const result = HealthSummaryOutputSchema.safeParse({
      status_label: 'stable',
      summary: '',
      reasons: ['ok'],
      suggestions: ['ok'],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty reasons array', () => {
    const result = HealthSummaryOutputSchema.safeParse({
      status_label: 'attention',
      summary: '需要注意',
      reasons: [],
      suggestions: ['看醫生'],
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid status_label', () => {
    const result = HealthSummaryOutputSchema.safeParse({
      status_label: 'unknown',
      summary: 'test',
      reasons: ['reason'],
      suggestions: ['suggestion'],
    });
    expect(result.success).toBe(false);
  });
});

describe('TrendAnalysisOutputSchema', () => {
  it('should accept valid output', () => {
    const result = TrendAnalysisOutputSchema.safeParse({
      trend_direction: 'improving',
      explanation: '血壓趨勢正在改善',
      key_observations: ['收縮壓下降 5%'],
      suggestions: ['持續監測'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid trend_direction', () => {
    const result = TrendAnalysisOutputSchema.safeParse({
      trend_direction: 'unknown',
      explanation: 'test',
      key_observations: ['obs'],
      suggestions: ['sug'],
    });
    expect(result.success).toBe(false);
  });
});

describe('VisitPrepOutputSchema', () => {
  it('should accept valid output', () => {
    const result = VisitPrepOutputSchema.safeParse({
      questions: [{ category: '血壓', question: '最近血壓偏高的原因？' }],
      data_to_bring: ['最近一週血壓紀錄'],
      notes: '建議提前 10 分鐘到達',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty questions array', () => {
    const result = VisitPrepOutputSchema.safeParse({
      questions: [],
      data_to_bring: ['something'],
      notes: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('FamilyUpdateOutputSchema', () => {
  it('should accept valid output', () => {
    const result = FamilyUpdateOutputSchema.safeParse({
      greeting: '親愛的家人好',
      health_update: '王奶奶本週血壓穩定',
      highlights: ['每日按時量測', '數據無異常'],
      closing: '祝平安',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty health_update', () => {
    const result = FamilyUpdateOutputSchema.safeParse({
      greeting: '',
      health_update: '',
      highlights: ['h'],
      closing: '',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Chat Output Schemas ──────────────────────────────────────

describe('TrendExplanationOutputSchema', () => {
  it('should accept valid output', () => {
    const result = TrendExplanationOutputSchema.safeParse({
      explanation: '近七天血壓呈下降趨勢',
      key_points: ['收縮壓平均 125'],
    });
    expect(result.success).toBe(true);
  });
});

describe('FamilyChatOutputSchema', () => {
  it('should accept valid output', () => {
    const result = FamilyChatOutputSchema.safeParse({
      message: '王奶奶本週狀況良好',
      highlights: ['血壓穩定', '每日按時量測'],
    });
    expect(result.success).toBe(true);
  });
});

describe('VisitQuestionsOutputSchema', () => {
  it('should accept valid output', () => {
    const result = VisitQuestionsOutputSchema.safeParse({
      questions: ['血壓藥物是否需要調整？'],
      reminders: ['帶健保卡'],
    });
    expect(result.success).toBe(true);
  });
});

// ─── Disclaimer ───────────────────────────────────────────────

describe('AI_DISCLAIMER', () => {
  it('should be a non-empty string', () => {
    expect(AI_DISCLAIMER.length).toBeGreaterThan(0);
  });

  it('should contain key warning text', () => {
    expect(AI_DISCLAIMER).toContain('免責聲明');
    expect(AI_DISCLAIMER).toContain('醫療');
  });
});
