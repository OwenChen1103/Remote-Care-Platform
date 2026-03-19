import { useState } from 'react';
import {
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '@/lib/api-client';

export default function AddAppointmentScreen() {
  const { recipientId } = useLocalSearchParams<{ recipientId: string }>();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [department, setDepartment] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '請輸入行程標題');
      return;
    }
    if (!dateStr.trim()) {
      Alert.alert('提示', '請輸入就診日期（格式：YYYY-MM-DD）');
      return;
    }
    if (!recipientId) {
      Alert.alert('錯誤', '缺少被照護者資訊');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr.trim())) {
      Alert.alert('提示', '日期格式不正確，請使用 YYYY-MM-DD 格式');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/appointments', {
        recipient_id: recipientId,
        title: title.trim(),
        hospital_name: hospitalName.trim() || undefined,
        department: department.trim() || undefined,
        doctor_name: doctorName.trim() || undefined,
        appointment_date: new Date(dateStr.trim()).toISOString(),
        note: note.trim() || undefined,
      });

      Alert.alert('成功', '行程已新增', [
        { text: '確定', onPress: () => router.back() },
      ]);
    } catch (err) {
      if (err instanceof ApiError) {
        Alert.alert('錯誤', err.message);
      } else {
        Alert.alert('錯誤', '新增失敗，請稍後再試');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Default date hint: 7 days from now
  const defaultHint = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>新增就醫行程</Text>

      <Text style={styles.label}>行程標題 *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="例如：台大醫院回診"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>就診日期 *</Text>
      <TextInput
        style={styles.input}
        value={dateStr}
        onChangeText={setDateStr}
        placeholder={`格式：${defaultHint}`}
        placeholderTextColor="#9ca3af"
        keyboardType={Platform.OS === 'ios' ? 'default' : 'default'}
      />

      <Text style={styles.label}>醫院名稱</Text>
      <TextInput
        style={styles.input}
        value={hospitalName}
        onChangeText={setHospitalName}
        placeholder="例如：台大醫院"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>科別</Text>
      <TextInput
        style={styles.input}
        value={department}
        onChangeText={setDepartment}
        placeholder="例如：心臟內科"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>醫師姓名</Text>
      <TextInput
        style={styles.input}
        value={doctorName}
        onChangeText={setDoctorName}
        placeholder="例如：陳醫師"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>備註</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={note}
        onChangeText={setNote}
        placeholder="其他備註事項..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>{submitting ? '新增中...' : '新增行程'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: { textAlignVertical: 'top', minHeight: 80 },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
