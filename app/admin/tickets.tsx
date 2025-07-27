import { auth, db } from '@/api/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface SupportTicket {
  id: string;
  userId?: string; // support_tickets'ta olmayabilir
  userEmail?: string; // support_tickets'ta email olarak gelir
  email?: string; // support_tickets'tan gelen email field
  subject: string;
  description?: string; // supportTickets'ta description
  message?: string; // support_tickets'ta message
  status: string;
  priority?: string; // support_tickets'ta priority var
  source: string; // hangi koleksiyondan geldiğini belirtir - required
  createdAt: any;
}

const AdminTicketsScreen = () => {
  const router = useRouter();
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

  // Filtered tickets based on active tab
  const filteredTickets = allTickets.filter(ticket => {
    return activeTab === 'open' ? 
      ticket.status === 'open' || ticket.status === 'pending' : 
      ticket.status === 'closed' || ticket.status === 'resolved';
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!auth || !db) {
        setIsAdmin(false);
        setLoading(false);
        router.replace('/login');
        return;
      }
      const user = auth.currentUser;
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        router.replace('/login');
        return;
      }
      let unsubscribeSupportTickets: (() => void) | null = null;
      let unsubscribeLoginTickets: (() => void) | null = null;
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.role === 'admin') {
            setIsAdmin(true);
            let supportTicketsData: SupportTicket[] = [];
            let loginTicketsData: SupportTicket[] = [];
            const updateCombinedTickets = (newTickets: SupportTicket[], source: string) => {
              if (source === 'supportTickets') {
                supportTicketsData = newTickets;
              } else {
                loginTicketsData = newTickets;
              }
              const combined = [...supportTicketsData, ...loginTicketsData];
              combined.sort((a, b) => {
                const aDate = a.createdAt?.toDate?.() || a.createdAt;
                const bDate = b.createdAt?.toDate?.() || b.createdAt;
                return bDate - aDate;
              });
              setAllTickets(combined);
              setLoading(false);
            };
            const supportTicketsRef = db ? collection(db, 'supportTickets') : undefined;
            if (supportTicketsRef) {
              const q1 = query(supportTicketsRef, orderBy('createdAt', 'desc'));
              unsubscribeSupportTickets = onSnapshot(q1, (querySnapshot) => {
                const supportTickets = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  source: 'authenticated_user',
                  ...doc.data(),
                })) as SupportTicket[];
                updateCombinedTickets(supportTickets, 'supportTickets');
              }, (error) => {
                if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                  return;
                }
                console.error("Error fetching supportTickets:", error);
              });
            }
            const loginTicketsRef = db ? collection(db, 'support_tickets') : undefined;
            if (loginTicketsRef) {
              const q2 = query(loginTicketsRef, orderBy('createdAt', 'desc'));
              unsubscribeLoginTickets = onSnapshot(q2, (querySnapshot) => {
                const loginTickets = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  source: 'login_page',
                  ...doc.data(),
                })) as SupportTicket[];
                updateCombinedTickets(loginTickets, 'support_tickets');
              }, (error) => {
                if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                  return;
                }
                console.error("Error fetching support_tickets:", error);
              });
            }
          } else {
            setIsAdmin(false);
            setLoading(false);
            Alert.alert("Erişim Reddedildi", "Bu sayfaya erişim yetkiniz yok.");
            router.replace('/login');
          }
        } else {
          setIsAdmin(false);
          setLoading(false);
          Alert.alert("Hata", "Kullanıcı bilgileri bulunamadı.");
          router.replace('/login');
        }
      }, (error) => {
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          setLoading(false);
          return;
        }
        console.error("Error listening to user data:", error);
        Alert.alert("Hata", "Kullanıcı bilgileri alınırken bir sorun oluştu.");
        setLoading(false);
      });
      return () => {
        try {
          unsubscribeUser();
          if (unsubscribeSupportTickets) {
            unsubscribeSupportTickets();
          }
          if (unsubscribeLoginTickets) {
            unsubscribeLoginTickets();
          }
        } catch (error) {
          // ...existing code...
        }
      };
    };
    checkAdminStatus();
  }, [router]);

  const updateTicketStatus = async (ticketId: string, newStatus: string, source: string) => {
    try {
      if (!db) throw new Error('Firestore bağlantısı yok.');
      const collectionName = source === 'login_page' ? 'support_tickets' : 'supportTickets';
      const ticketRef = doc(db, collectionName, ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      Alert.alert('Hata', 'Durum güncellenirken bir sorun oluştu.');
    }
  };

  const renderTicketItem = ({ item }: { item: SupportTicket }) => {
    // Field adları farklı olduğu için uygun olanı seç
    const email = item.email || item.userEmail || 'Bilinmiyor';
    const content = item.message || item.description || 'İçerik bulunamadı';
    const sourceLabel = item.source === 'login_page' ? '🌐 İletişim Formu' : '👤 Profil Sayfası';
    
    const isOpen = item.status === 'open' || item.status === 'pending';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSubject}>{item.subject}</Text>
          <Text style={styles.sourceLabel}>{sourceLabel}</Text>
        </View>
        <Text style={styles.cardDescription}>{content}</Text>
        <View style={styles.cardInfoContainer}>
          <Text style={styles.cardInfo}>📧 {email}</Text>
          <Text style={styles.cardInfo}>📊 Durum: {item.status}</Text>
          {item.priority && <Text style={styles.cardInfo}>⚡ Öncelik: {item.priority}</Text>}
          <Text style={styles.cardInfo}>📅 {formatDate(item.createdAt)}</Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOpen ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.closeButton]}
              onPress={() => updateTicketStatus(item.id, 'closed', item.source)}
            >
              <Text style={styles.actionButtonText}>Kapat</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.openButton]}
              onPress={() => updateTicketStatus(item.id, 'open', item.source)}
            >
              <Text style={styles.actionButtonText}>Yeniden Aç</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Tarih bilinmiyor';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('tr-TR');
    } catch (error) {
      return 'Geçersiz tarih';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.accessDeniedText}>Bu sayfaya erişim yetkiniz yok.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonAccessDenied}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Destek Talepleri</Text>
        <View style={{ width: 28 }} />
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'open' && styles.activeTab]}
          onPress={() => setActiveTab('open')}
        >
          <Text style={[styles.tabText, activeTab === 'open' && styles.activeTabText]}>
            Açık Talepler ({allTickets.filter(t => t.status === 'open' || t.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'closed' && styles.activeTab]}
          onPress={() => setActiveTab('closed')}
        >
          <Text style={[styles.tabText, activeTab === 'closed' && styles.activeTabText]}>
            Kapalı Talepler ({allTickets.filter(t => t.status === 'closed' || t.status === 'resolved').length})
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredTickets}
        renderItem={renderTicketItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {activeTab === 'open' ? 'Açık talep bulunmuyor.' : 'Kapalı talep bulunmuyor.'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.base,
    marginBottom: SIZES.base,
  },
  backButton: {
    padding: SIZES.base,
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    textAlign: 'center',
  },
  listContentContainer: { paddingHorizontal: SIZES.large, paddingBottom: SIZES.large },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.large,
    marginBottom: SIZES.medium,
    padding: SIZES.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardSubject: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.darkGray,
    marginBottom: SIZES.base / 2,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.base / 2,
  },
  sourceLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.primary,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.base / 2,
    borderRadius: SIZES.base,
    marginLeft: SIZES.base,
  },
  cardDescription: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.font,
    color: COLORS.gray,
    marginBottom: SIZES.base,
  },
  cardInfoContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: SIZES.base,
    gap: SIZES.base / 2,
  },
  cardInfo: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.darkGray,
  },
  accessDeniedText: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: SIZES.large,
  },
  backButtonAccessDenied: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radius,
  },
  backButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.large,
    marginBottom: SIZES.medium,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.darkGray,
  },
  activeTabText: {
    color: COLORS.white,
  },
  // Action button styles
  actionButtons: {
    flexDirection: 'row',
    marginTop: SIZES.medium,
    paddingTop: SIZES.medium,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    gap: SIZES.base,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.base,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: COLORS.danger,
  },
  openButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
  },
});

export default AdminTicketsScreen;
