import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { api, ApiError } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────

interface Recipient {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  medical_tags: string[];
}

interface Measurement {
  id: string;
  type: string;
  systolic: number | null;
  diastolic: number | null;
  heart_rate: number | null;
  glucose_value: number | null;
  glucose_timing: string | null;
  is_abnormal: boolean;
  measured_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatBP(m: Measurement): string {
  return `${m.systolic}/${m.diastolic} mmHg${m.heart_rate ? ` (心率 ${m.heart_rate})` : ''}`;
}

function formatBG(m: Measurement): string {
  const timingMap: Record<string, string> = {
    fasting: '空腹',
    before_meal: '餐前',
    after_meal: '餐後',
    bedtime: '睡前',
  };
  const timing = m.glucose_timing ? timingMap[m.glucose_timing] ?? m.glucose_timing : '';
  return `${m.glucose_value} mg/dL${timing ? ` (${timing})` : ''}`;
}

// ─── Component ────────────────────────────────────────────────

export default function PatientSummaryScreen() {
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');

      // 1. Get patient's own recipient record
      const recipients = await api.get<Recipient[]>('/recipients?limit=1');
      const first = recipients[0];
      if (!first) {
        setRecipient(null);
        setMeasurements([]);
        return;
      }

      setRecipient(first);

      // 2. Get recent measurements (last 10)
      const mData = await api.get<Measurement[]>(
        `/measurements?recipient_id=${first.id}&limit=10`,
      );
      setMeasurements(mData as Measurement[]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('載入資料失敗');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>載入中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!recipient) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>尚未建立被照護者資料</Text>
      </View>
    );
  }

  const latestBP = measurements.find((m) => m.type === 'blood_pressure');
  const latestBG = measurements.find((m) => m.type === 'blood_glucose');
  const abnormalCount = measurements.filter((m) => m.is_abnormal).length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profile card */}
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{recipient.name}</Text>
        <View style={styles.tagRow}>
          {recipient.medical_tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Latest measurements */}
      <Text style={styles.sectionTitle}>最新量測</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>血壓</Text>
        {latestBP ? (
          <>
            <Text style={[styles.cardValue, latestBP.is_abnormal && styles.abnormal]}>
              {formatBP(latestBP)}
            </Text>
            <Text style={styles.cardTime}>{formatDate(latestBP.measured_at)}</Text>
          </>
        ) : (
          <Text style={styles.cardEmpty}>尚無紀錄</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>血糖</Text>
        {latestBG ? (
          <>
            <Text style={[styles.cardValue, latestBG.is_abnormal && styles.abnormal]}>
              {formatBG(latestBG)}
            </Text>
            <Text style={styles.cardTime}>{formatDate(latestBG.measured_at)}</Text>
          </>
        ) : (
          <Text style={styles.cardEmpty}>尚無紀錄</Text>
        )}
      </View>

      {/* Summary stats */}
      <Text style={styles.sectionTitle}>近期摘要</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{measurements.length}</Text>
          <Text style={styles.statLabel}>近期量測數</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, abnormalCount > 0 && styles.abnormal]}>
            {abnormalCount}
          </Text>
          <Text style={styles.statLabel}>異常筆數</Text>
        </View>
      </View>

      {/* Recent list */}
      <Text style={styles.sectionTitle}>量測紀錄</Text>
      {measurements.map((m) => (
        <View key={m.id} style={[styles.listItem, m.is_abnormal && styles.listItemAbnormal]}>
          <View style={styles.listLeft}>
            <Text style={styles.listType}>{m.type === 'blood_pressure' ? '血壓' : '血糖'}</Text>
            <Text style={styles.listValue}>
              {m.type === 'blood_pressure' ? formatBP(m) : formatBG(m)}
            </Text>
          </View>
          <Text style={styles.listTime}>{formatDate(m.measured_at)}</Text>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 8, color: '#64748b' },
  errorText: { color: '#ef4444', fontSize: 16 },
  emptyText: { color: '#94a3b8', fontSize: 16 },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileName: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: '#2563eb' },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 10, marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLabel: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  cardTime: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  cardEmpty: { fontSize: 15, color: '#cbd5e1' },
  abnormal: { color: '#ef4444' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },

  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listItemAbnormal: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  listLeft: { flex: 1 },
  listType: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  listValue: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  listTime: { fontSize: 12, color: '#94a3b8' },
});
