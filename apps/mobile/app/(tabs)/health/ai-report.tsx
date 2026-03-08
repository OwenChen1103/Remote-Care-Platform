import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { api, ApiError } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────

interface Recipient {
  id: string;
  name: string;
}

interface ReportResult {
  id: string;
  recipient_id: string;
  report_type: string;
  status_label: string;
  summary: string;
  reasons: string[];
  suggestions: string[];
  detail: Record<string, unknown>;
  disclaimer: string;
  is_fallback: boolean;
  generated_at: string;
}

interface ChatResult {
  task: string;
  result: Record<string, unknown>;
  disclaimer: string;
  is_fallback: boolean;
}

interface HistoricalReport {
  id: string;
  report_type: string;
  status_label: string;
  summary: string;
  reasons: string[];
  suggestions: string[];
  disclaimer: string;
  generated_at: string;
}

// ─── Constants ────────────────────────────────────────────────

const REPORT_TYPES = [
  { key: 'health_summary', label: '放心報' },
  { key: 'trend_analysis', label: '趨勢解讀' },
  { key: 'visit_prep', label: '看診問題' },
  { key: 'family_update', label: '家人摘要' },
] as const;

const CHAT_TASKS = [
  { key: 'trend_explanation', label: '趨勢解讀' },
  { key: 'family_update', label: '家人近況' },
  { key: 'visit_questions', label: '看診問題' },
] as const;

const DEFAULT_STATUS = { bg: '#dcfce7', text: '#166534', label: '穩定' };

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  stable: DEFAULT_STATUS,
  attention: { bg: '#fef9c3', text: '#854d0e', label: '需注意' },
  consult_doctor: { bg: '#fee2e2', text: '#991b1b', label: '建議就醫' },
};

// ─── Component ────────────────────────────────────────────────

export default function AiReportScreen() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('health_summary');
  const [mode, setMode] = useState<'report' | 'chat'>('report');
  const [selectedTask, setSelectedTask] = useState<string>('trend_explanation');

  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [chatResult, setChatResult] = useState<ChatResult | null>(null);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<HistoricalReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch recipients
  useEffect(() => {
    void (async () => {
      try {
        const result = await api.get<Recipient[]>('/recipients');
        setRecipients(result);
        if (result[0] && !selectedRecipientId) {
          setSelectedRecipientId(result[0].id);
        }
      } catch {
        // Silent — recipients should already be loaded elsewhere
      }
    })();
  }, [selectedRecipientId]);

  // Fetch history when recipient changes
  const fetchHistory = useCallback(async () => {
    if (!selectedRecipientId) return;
    setHistoryLoading(true);
    try {
      const result = await api.get<HistoricalReport[]>(
        `/ai/reports?recipient_id=${selectedRecipientId}&limit=10`,
      );
      setHistory(result);
    } catch {
      // Non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedRecipientId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedRecipientId) return;
    setGenerating(true);
    setError('');
    setReport(null);
    setChatResult(null);
    try {
      const result = await api.post<ReportResult>('/ai/health-report', {
        recipient_id: selectedRecipientId,
        report_type: selectedType,
      });
      setReport(result);
      void fetchHistory(); // Refresh history
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'AI_RATE_LIMITED') {
          setError('已達到報告生成上限，請稍後再試');
        } else {
          setError(e.message);
        }
      } else {
        setError('生成失敗，請稍後再試');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Generate chat
  const handleGenerateChat = async () => {
    if (!selectedRecipientId) return;
    setGenerating(true);
    setError('');
    setReport(null);
    setChatResult(null);
    try {
      const result = await api.post<ChatResult>('/ai/chat', {
        recipient_id: selectedRecipientId,
        task: selectedTask,
      });
      setChatResult(result);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'AI_RATE_LIMITED') {
          setError('已達到 AI 對話上限，請稍後再試');
        } else {
          setError(e.message);
        }
      } else {
        setError('生成失敗，請稍後再試');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Share
  const handleShare = async (text: string) => {
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(text);
      return;
    }
    await Share.share({ message: text });
  };

  const buildShareText = (): string => {
    if (report) {
      const lines = [
        `【${REPORT_TYPES.find((t) => t.key === report.report_type)?.label ?? report.report_type}】`,
        report.summary,
        '',
        '原因：',
        ...report.reasons.map((r) => `• ${r}`),
        '',
        '建議：',
        ...report.suggestions.map((s) => `• ${s}`),
        '',
        report.disclaimer,
      ];
      return lines.join('\n');
    }
    if (chatResult) {
      const result = chatResult.result;
      const parts: string[] = [];
      if (result.explanation) parts.push(result.explanation as string);
      if (result.message) parts.push(result.message as string);
      if (result.questions) {
        parts.push('建議問題：');
        (result.questions as string[]).forEach((q) => parts.push(`• ${q}`));
      }
      if (result.key_points) {
        parts.push('重點：');
        (result.key_points as string[]).forEach((p) => parts.push(`• ${p}`));
      }
      if (result.highlights) {
        parts.push('重點：');
        (result.highlights as string[]).forEach((h) => parts.push(`• ${h}`));
      }
      parts.push('', chatResult.disclaimer);
      return parts.join('\n');
    }
    return '';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>AI 放心報</Text>

      {/* Recipient selector */}
      {recipients.length > 1 && (
        <ScrollView horizontal style={styles.selectorRow} contentContainerStyle={styles.selectorContent}>
          {recipients.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.chip, r.id === selectedRecipientId && styles.chipActive]}
              onPress={() => setSelectedRecipientId(r.id)}
            >
              <Text style={[styles.chipText, r.id === selectedRecipientId && styles.chipTextActive]}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'report' && styles.modeActive]}
          onPress={() => setMode('report')}
        >
          <Text style={[styles.modeText, mode === 'report' && styles.modeTextActive]}>報告</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'chat' && styles.modeActive]}
          onPress={() => setMode('chat')}
        >
          <Text style={[styles.modeText, mode === 'chat' && styles.modeTextActive]}>快速問答</Text>
        </TouchableOpacity>
      </View>

      {/* Report type / Chat task selector */}
      {mode === 'report' ? (
        <View style={styles.typeRow}>
          {REPORT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeChip, selectedType === t.key && styles.typeChipActive]}
              onPress={() => setSelectedType(t.key)}
            >
              <Text style={[styles.typeText, selectedType === t.key && styles.typeTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.typeRow}>
          {CHAT_TASKS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeChip, selectedTask === t.key && styles.typeChipActive]}
              onPress={() => setSelectedTask(t.key)}
            >
              <Text style={[styles.typeText, selectedTask === t.key && styles.typeTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateButton, generating && styles.generateButtonDisabled]}
        disabled={generating || !selectedRecipientId}
        onPress={() => void (mode === 'report' ? handleGenerateReport() : handleGenerateChat())}
      >
        {generating ? (
          <View style={styles.generatingRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.generateText}>AI 正在分析中...</Text>
          </View>
        ) : (
          <Text style={styles.generateText}>
            {mode === 'report' ? '生成報告' : '生成'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Report result */}
      {report && (
        <View style={styles.resultCard}>
          {/* Status badge */}
          {(() => {
            const sc = STATUS_COLORS[report.status_label] ?? DEFAULT_STATUS;
            return (
              <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
              </View>
            );
          })()}

          <Text style={styles.resultSummary}>{report.summary}</Text>

          {report.reasons.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>原因</Text>
              {report.reasons.map((r, i) => (
                <Text key={i} style={styles.resultItem}>• {r}</Text>
              ))}
            </View>
          )}

          {report.suggestions.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>建議</Text>
              {report.suggestions.map((s, i) => (
                <Text key={i} style={styles.resultItem}>• {s}</Text>
              ))}
            </View>
          )}

          {report.is_fallback && (
            <Text style={styles.fallbackNote}>（AI 暫時無法回應，以上為預設文字）</Text>
          )}

          <Text style={styles.disclaimer}>{report.disclaimer}</Text>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => void handleShare(buildShareText())}
          >
            <Text style={styles.shareText}>分享</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat result */}
      {chatResult && (
        <View style={styles.resultCard}>
          {typeof chatResult.result.explanation === 'string' && (
            <Text style={styles.resultSummary}>{chatResult.result.explanation}</Text>
          )}
          {typeof chatResult.result.message === 'string' && (
            <Text style={styles.resultSummary}>{chatResult.result.message}</Text>
          )}
          {Array.isArray(chatResult.result.key_points) && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>重點</Text>
              {(chatResult.result.key_points as string[]).map((p, i) => (
                <Text key={i} style={styles.resultItem}>• {p}</Text>
              ))}
            </View>
          )}
          {Array.isArray(chatResult.result.highlights) && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>重點</Text>
              {(chatResult.result.highlights as string[]).map((h, i) => (
                <Text key={i} style={styles.resultItem}>• {h}</Text>
              ))}
            </View>
          )}
          {Array.isArray(chatResult.result.questions) && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>建議問題</Text>
              {(chatResult.result.questions as string[]).map((q, i) => (
                <Text key={i} style={styles.resultItem}>• {q}</Text>
              ))}
            </View>
          )}
          {Array.isArray(chatResult.result.reminders) && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>提醒</Text>
              {(chatResult.result.reminders as string[]).map((r, i) => (
                <Text key={i} style={styles.resultItem}>• {r}</Text>
              ))}
            </View>
          )}

          {chatResult.is_fallback && (
            <Text style={styles.fallbackNote}>（AI 暫時無法回應，以上為預設文字）</Text>
          )}

          <Text style={styles.disclaimer}>{chatResult.disclaimer}</Text>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => void handleShare(buildShareText())}
          >
            <Text style={styles.shareText}>分享</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* History */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>歷史報告</Text>
          {historyLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            history.map((h) => {
              const sc = STATUS_COLORS[h.status_label] ?? DEFAULT_STATUS;
              return (
                <View key={h.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyType}>
                      {REPORT_TYPES.find((t) => t.key === h.report_type)?.label ?? h.report_type}
                    </Text>
                    <View style={[styles.historyBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.historyBadgeText, { color: sc.text }]}>{sc.label}</Text>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(h.generated_at).toLocaleDateString('zh-TW')}
                    </Text>
                  </View>
                  <Text style={styles.historySummary} numberOfLines={2}>
                    {h.summary}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },

  selectorRow: { maxHeight: 44, marginBottom: 12 },
  selectorContent: { gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#3b82f6' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeButton: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#e5e7eb', alignItems: 'center',
  },
  modeActive: { backgroundColor: '#3b82f6' },
  modeText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modeTextActive: { color: '#fff' },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  typeChipActive: { backgroundColor: '#dbeafe' },
  typeText: { fontSize: 13, color: '#374151' },
  typeTextActive: { color: '#1d4ed8', fontWeight: '600' },

  generateButton: {
    backgroundColor: '#3b82f6', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  generateButtonDisabled: { opacity: 0.6 },
  generateText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  errorText: {
    fontSize: 14, color: '#dc2626', backgroundColor: '#fef2f2',
    padding: 12, borderRadius: 8, textAlign: 'center', marginBottom: 12, overflow: 'hidden',
  },

  resultCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  statusText: { fontSize: 13, fontWeight: '600' },
  resultSummary: { fontSize: 16, color: '#1f2937', lineHeight: 24, marginBottom: 12 },
  resultSection: { marginBottom: 10 },
  resultLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  resultItem: { fontSize: 14, color: '#374151', lineHeight: 22 },
  fallbackNote: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginBottom: 8 },

  disclaimer: {
    fontSize: 11, color: '#9ca3af', lineHeight: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb',
    paddingTop: 10, marginTop: 10,
  },

  shareButton: {
    backgroundColor: '#dbeafe', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', marginTop: 12,
  },
  shareText: { fontSize: 14, fontWeight: '600', color: '#1d4ed8' },

  historySection: { marginTop: 8 },
  historyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 10 },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  historyType: { fontSize: 13, fontWeight: '600', color: '#374151' },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  historyBadgeText: { fontSize: 11, fontWeight: '600' },
  historyDate: { fontSize: 12, color: '#9ca3af', marginLeft: 'auto' },
  historySummary: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
});
