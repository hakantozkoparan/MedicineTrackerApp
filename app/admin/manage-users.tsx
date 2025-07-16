import { auth, db } from '@/api/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface User {
  uid: string;
  name: string;
  surname: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedBy?: string;
  role?: string;
  createdAt?: any;
  lastLoginAt?: any;
}

const ManageUsersScreen = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      // Admin kontrolü
      const userDocRef = doc(db, 'users', user.uid);
      const userDocUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const userIsAdmin = userData.role === 'admin';
          setIsAdmin(userIsAdmin);
          
          if (!userIsAdmin) {
            Alert.alert('Yetkisiz Erişim', 'Bu sayfaya erişim yetkiniz yok.');
            router.replace('/login');
            return;
          }
        } else {
          setIsAdmin(false);
          router.replace('/login');
        }
      }, (error) => {
        // Permission hatası veya kullanıcı çıkış yapmışsa sessizce handle et
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          console.log('Kullanıcı çıkış yapmış, manage-users listener kapatılıyor.');
          setIsAdmin(false);
          router.replace('/login');
          return;
        }
        console.error('Manage users snapshot error:', error);
      });

      return () => {
        try {
          userDocUnsubscribe();
        } catch (error) {
          console.log("Manage users listener already unsubscribed");
        }
      };
    });

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.log("Auth listener already unsubscribed in manage-users");
      }
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const userSnapshot = await getDocs(usersCollection);
      const usersList = userSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
      
      // Admin kullanıcıları en üste koy, sonra email doğrulanmamış olanları
      usersList.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        if (!a.emailVerified && b.emailVerified) return -1;
        if (a.emailVerified && !b.emailVerified) return 1;
        return 0;
      });
      
      setUsers(usersList);
      setFilteredUsers(usersList); // Arama için filtrelenmiş listeyi de set et
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      Alert.alert('Hata', 'Kullanıcılar yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.surname.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredUsers(users);
  };

  const manualEmailVerification = async (targetUser: User) => {
    Alert.alert(
      'Manuel Email Doğrulama',
      `${targetUser.name} ${targetUser.surname} (${targetUser.email}) kullanıcısının email adresini manuel olarak doğrulanmış olarak işaretlemek istediğinizden emin misiniz?\n\n⚠️ Bu işlem geri alınamaz!`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔧 Manuel email doğrulama başlatıldı:', {
                targetUserId: targetUser.uid,
                targetUserEmail: targetUser.email,
                currentEmailVerified: targetUser.emailVerified,
                adminEmail: auth.currentUser?.email
              });
              
              const userDocRef = doc(db, 'users', targetUser.uid);
              const updateData = {
                emailVerified: true,
                emailVerifiedBy: 'admin',
                emailVerifiedAt: new Date(),
                emailVerifiedByAdmin: auth.currentUser?.email || 'unknown',
                manualVerificationDate: new Date()
              };
              
              await updateDoc(userDocRef, updateData).catch(async (firestoreError) => {
                if (firestoreError.code === 'not-found') {
                  console.log('🔧 Kullanıcı belgesi bulunamadı, yeni belge oluşturuluyor');
                  await setDoc(userDocRef, {
                    ...targetUser,
                    ...updateData
                  });
                } else {
                  throw firestoreError;
                }
              });

              console.log('✅ Manuel email doğrulama tamamlandı:', {
                targetUserId: targetUser.uid,
                targetUserEmail: targetUser.email,
                updateData
              });

              Alert.alert(
                'Başarılı!', 
                `${targetUser.name} ${targetUser.surname} kullanıcısının email adresi manuel olarak doğrulandı. Kullanıcı artık giriş yapabilir.`
              );
              
              // Listeyi yenile
              fetchUsers();
            } catch (error: any) {
              console.error('❌ Manuel doğrulama hatası:', error);
              Alert.alert('Hata', 'Manuel doğrulama işlemi başarısız oldu: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const makeAdmin = async (targetUser: User) => {
    Alert.alert(
      'Admin Yetkisi Ver',
      `${targetUser.name} ${targetUser.surname} kullanıcısına admin yetkisi vermek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              const userDocRef = doc(db, 'users', targetUser.uid);
              await updateDoc(userDocRef, {
                role: 'admin',
                promotedToAdminAt: new Date(),
                promotedBy: auth.currentUser?.email || 'unknown'
              });

              Alert.alert('Başarılı!', 'Kullanıcıya admin yetkisi verildi.');
              fetchUsers();
            } catch (error: any) {
              console.error('Admin yetkisi verme hatası:', error);
              Alert.alert('Hata', 'Admin yetkisi verilirken bir sorun oluştu.');
            }
          }
        }
      ]
    );
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.name} {item.surname}</Text>
          {item.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Ionicons 
              name={item.emailVerified ? "checkmark-circle" : "warning"} 
              size={16} 
              color={item.emailVerified ? COLORS.success : COLORS.warning} 
            />
            <Text style={[styles.statusText, { color: item.emailVerified ? COLORS.success : COLORS.warning }]}>
              {item.emailVerified ? 'Email Doğrulanmış' : 'Email Doğrulanmamış'}
            </Text>
          </View>
          
          {item.emailVerifiedBy === 'admin' && (
            <Text style={styles.manualVerifiedText}>Manuel doğrulanmış</Text>
          )}
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        {!item.emailVerified && (
          <TouchableOpacity 
            style={styles.verifyButton} 
            onPress={() => manualEmailVerification(item)}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.white} />
            <Text style={styles.verifyButtonText}>Doğrula</Text>
          </TouchableOpacity>
        )}
        
        {item.role !== 'admin' && (
          <TouchableOpacity 
            style={styles.adminButton} 
            onPress={() => makeAdmin(item)}
          >
            <Ionicons name="person-add-outline" size={16} color={COLORS.white} />
            <Text style={styles.adminButtonText}>Admin Yap</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Kullanıcı Yönetimi</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>
      
      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Email, ad veya soyad ile ara..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <Text style={styles.searchResultText}>
            {filteredUsers.length} sonuç bulundu
          </Text>
        )}
      </View>
      
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.uid}
        renderItem={renderUser}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>
              {searchQuery.length > 0 ? 'Arama sonucu bulunamadı' : 'Henüz kullanıcı bulunmuyor'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.medium,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.base,
    marginBottom: SIZES.large,
  },
  backButton: {
    padding: SIZES.base,
  },
  refreshButton: {
    padding: SIZES.base,
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: SIZES.large,
    marginBottom: SIZES.medium,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    paddingHorizontal: SIZES.medium,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: COLORS.gray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: SIZES.base,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SIZES.medium,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.darkGray,
  },
  clearButton: {
    padding: SIZES.base,
    marginLeft: SIZES.base,
  },
  searchResultText: {
    marginTop: SIZES.small,
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: SIZES.large,
    paddingBottom: SIZES.large,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
    shadowColor: COLORS.gray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.base,
  },
  userName: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    flex: 1,
  },
  adminBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: SIZES.base,
    paddingVertical: 2,
    borderRadius: SIZES.base,
  },
  adminBadgeText: {
    fontSize: SIZES.small,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  userEmail: {
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginBottom: SIZES.base,
  },
  statusContainer: {
    marginBottom: SIZES.medium,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: SIZES.base,
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
  },
  manualVerifiedText: {
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SIZES.base,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.base,
    flex: 1,
  },
  verifyButtonText: {
    marginLeft: SIZES.base,
    fontFamily: FONTS.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.base,
    flex: 1,
  },
  adminButtonText: {
    marginLeft: SIZES.base,
    fontFamily: FONTS.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: SIZES.medium,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: 'center',
  },
});

export default ManageUsersScreen;
