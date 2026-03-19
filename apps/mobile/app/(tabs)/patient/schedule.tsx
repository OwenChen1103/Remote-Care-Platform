import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { api, ApiError } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  measurement_reminder: '\u23F0',
  abnormal_alert: '\u26A0\uFE0F',
  appointment_reminder: '\uD83D\uDCC5',
  service_request_update: '\uD83D\uDCE6',
  ai_report_ready: '\uD83D\uDCCA',
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Component ────────────────────────────────────────────────

export default function PatientScheduleScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const data = await api.get<Notification[]>('/notifications?limit=30');
      setNotifications(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('載入通知失敗');
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

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = TYPE_ICON[item.type] ?? '\uD83D\uDD14';

    return (
      <View style={[styles.card, !item.is_read && styles.cardUnread]}>
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={notifications.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>暫無通知</Text>}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 8, color: '#64748b' },
  errorText: { color: '#ef4444', fontSize: 16 },
  emptyText: { color: '#94a3b8', fontSize: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardUnread: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f0f9ff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: { fontSize: 18, marginRight: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 8,
  },
  body: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 6 },
  time: { fontSize: 11, color: '#94a3b8' },
});
