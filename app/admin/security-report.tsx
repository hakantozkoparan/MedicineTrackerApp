import { auth } from '@/api/firebase';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import SecurityManager, { SecurityAttempt } from '@/utils/SecurityManager';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SecurityReportScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suspiciousDevices, setSuspiciousDevices] = useState<SecurityAttempt[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      // Admin kontrolü yapılacak - şimdilik tüm kullanıcılara açık
      setUserRole('admin');
      loadSuspiciousDevices();
    } catch (error) {
      console.error('Admin erişim kontrolü hatası:', error);
      router.replace('/(tabs)');
    }
  };

  const loadSuspiciousDevices = async () => {
    try {
      setLoading(true);
      const securityManager = SecurityManager.getInstance();
      const devices = await securityManager.getSuspiciousDevices();
      setSuspiciousDevices(devices);
    } catch (error) {
      console.error('Şüpheli cihazlar yüklenemedi:', error);
      Alert.alert('Hata', 'Güvenlik raporu yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSuspiciousDevices();
    setRefreshing(false);
  };

  const unblockDevice = async (deviceId: string) => {
    try {
      const securityManager = SecurityManager.getInstance();
      const success = await securityManager.unblockDevice(deviceId);
      
      if (success) {
        Alert.alert('Başarılı', 'Cihaz engeli kaldırıldı.');
        loadSuspiciousDevices(); // Listeyi yenile
      } else {
        Alert.alert('Hata', 'Cihaz engeli kaldırılamadı.');
      }
    } catch (error) {
      console.error('Cihaz engeli kaldırma hatası:', error);
      Alert.alert('Hata', 'Bir hata oluştu.');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Bilinmiyor';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleString('tr-TR');
  };

  const renderSuspiciousDevice = ({ item }: { item: SecurityAttempt }) => {
    const recentFailedAttempts = item.attempts.filter((attempt: any) => {
      const attemptDate = attempt.timestamp instanceof Date ? attempt.timestamp : attempt.timestamp.toDate();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return !attempt.success && attemptDate > oneDayAgo;
    }).length;

    const isBlocked = item.blockedUntil && 
      (item.blockedUntil instanceof Date ? item.blockedUntil : item.blockedUntil.toDate()) > new Date();

    return (
      <View style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <Text style={styles.deviceId}>Cihaz: {item.deviceId.substring(0, 16)}...</Text>
          {isBlocked && <Text style={styles.blockedBadge}>ENGELLİ</Text>}
        </View>
        
        <View style={styles.deviceInfo}>
          <Text style={styles.infoText}>İşletim Sistemi: {item.deviceInfo.osName || 'Bilinmiyor'}</Text>
          <Text style={styles.infoText}>Cihaz: {item.deviceInfo.deviceName || 'Bilinmiyor'}</Text>
          <Text style={styles.infoText}>Toplam Deneme: {item.totalAttempts}</Text>
          <Text style={styles.infoText}>Son 24 Saat Başarısız: {recentFailedAttempts}</Text>
          <Text style={styles.infoText}>Son Güncelleme: {formatDate(item.updatedAt)}</Text>
          {isBlocked && (
            <Text style={styles.infoText}>
              Engel Bitiş: {formatDate(item.blockedUntil)}
            </Text>
          )}
        </View>

        <View style={styles.deviceActions}>
          {isBlocked && (
            <TouchableOpacity 
              style={styles.unblockButton}
              onPress={() => {
                Alert.alert(
                  'Engeli Kaldır',
                  'Bu cihazın engelini kaldırmak istediğinizden emin misiniz?',
                  [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Evet', onPress: () => unblockDevice(item.deviceId) }
                  ]
                );
              }}
            >
              <Text style={styles.unblockButtonText}>Engeli Kaldır</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (userRole !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Bu sayfaya erişim yetkiniz yok.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Güvenlik Raporu</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Güvenlik raporu yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={suspiciousDevices}
          renderItem={renderSuspiciousDevice}
          keyExtractor={(item) => item.deviceId}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Şüpheli aktivite bulunamadı.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.medium,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    color: COLORS.white,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.white,
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    marginRight: 50, // Back button genişliği kadar sağa kaydır
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.large,
  },
  loadingText: {
    marginTop: SIZES.medium,
    color: COLORS.darkGray,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  listContainer: {
    padding: SIZES.medium,
  },
  deviceCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  deviceId: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.bold,
    color: COLORS.darkGray,
    flex: 1,
  },
  blockedBadge: {
    backgroundColor: COLORS.error,
    color: COLORS.white,
    fontSize: SIZES.small,
    fontFamily: FONTS.bold,
    paddingHorizontal: SIZES.small,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deviceInfo: {
    marginBottom: SIZES.small,
  },
  infoText: {
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.darkGray,
    marginBottom: 2,
  },
  deviceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  unblockButton: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radius,
  },
  unblockButtonText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontFamily: FONTS.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SIZES.xxLarge,
  },
  emptyText: {
    color: COLORS.darkGray,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
});

export default SecurityReportScreen;
