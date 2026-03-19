import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '@/lib/api-client';

interface Appointment {
  id: string;
  recipient_id: string;
  recipient: { id: string; name: string };
  title: string;
  hospital_name: string | null;
  department: string | null;
  doctor_name: string | null;
  appointment_date: string;
  note: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekDay = weekDays[d.getDay()];
  return `${month}/${day}（${weekDay}）`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AppointmentsScreen() {
  const { recipientId } = useLocalSearchParams<{ recipientId: string }>();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const query = recipientId ? `?recipient_id=${recipientId}&limit=50` : '?limit=50';
      const data = await api.get<Appointment[]>(`/appointments${query}`);
      setAppointments(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('載入行程失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recipientId]);

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

  const renderItem = ({ item }: { item: Appointment }) => {
    const days = daysUntil(item.appointment_date);
    const isPast = days < 0;
    const isToday = days === 0;
    const daysLabel = isToday ? '今天' : isPast ? `${Math.abs(days)} 天前` : `${days} 天後`;
    const daysColor = isPast ? '#94a3b8' : isToday ? '#ef4444' : days <= 3 ? '#f59e0b' : '#22c55e';

    return (
      <View style={[styles.card, isPast && styles.cardPast]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={[styles.daysLabel, { color: daysColor }]}>{daysLabel}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(item.appointment_date)}</Text>
        {item.hospital_name && (
          <Text style={styles.cardDetail}>
            {item.hospital_name}
            {item.department ? ` — ${item.department}` : ''}
          </Text>
        )}
        {item.doctor_name && (
          <Text style={styles.cardDetail}>醫師：{item.doctor_name}</Text>
        )}
        {item.note && <Text style={styles.cardNote}>{item.note}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={appointments.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>尚無行程</Text>}
      />

      {/* Add button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          router.push(`/(tabs)/home/add-appointment?recipientId=${recipientId ?? ''}`)
        }
      >
        <Text style={styles.addButtonText}>+ 新增行程</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 8, color: '#64748b' },
  errorText: { color: '#ef4444', fontSize: 16 },
  emptyText: { color: '#94a3b8', fontSize: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardPast: { opacity: 0.6 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', flex: 1 },
  daysLabel: { fontSize: 13, fontWeight: '600' },
  cardDate: { fontSize: 14, color: '#2563eb', marginBottom: 6 },
  cardDetail: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  cardNote: { fontSize: 12, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' },

  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
