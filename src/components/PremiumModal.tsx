import { COLORS, FONTS, SIZES } from '@/constants/theme';
import PurchaseManager, { SubscriptionPackage } from '@/services/PurchaseManager';
import RemoteLogger from '@/utils/RemoteLogger';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  currentMedicineCount?: number;
}

const PREMIUM_FEATURES = [
  {
    icon: 'medical-services',
    iconFamily: 'MaterialIcons',
    title: 'Sınırsız İlaç Ekleme',
    description: 'İstediğiniz kadar ilaç ekleyip takip edebilirsiniz',
  },
  {
    icon: 'notifications-active',
    iconFamily: 'MaterialIcons',
    title: 'Gelişmiş Hatırlatıcılar',
    description: 'Özelleştirilebilir bildirimler ve hatırlatma ayarları',
  },
  {
    icon: 'insights',
    iconFamily: 'MaterialIcons',
    title: 'Detaylı İstatistikler',
    description: 'İlaç kullanım geçmişiniz ve analiz raporları',
  },
  {
    icon: 'cloud-sync',
    iconFamily: 'MaterialIcons',
    title: 'Bulut Yedekleme',
    description: 'Verileriniz otomatik olarak bulutta güvende',
  },
  {
    icon: 'support-agent',
    iconFamily: 'MaterialIcons',
    title: 'Premium Destek',
    description: 'Öncelikli müşteri destek hizmeti',
  },
];

// Mock data for development (RevenueCat API key olmadığında)
const MOCK_PACKAGES: SubscriptionPackage[] = [
  {
    identifier: 'monthly_premium',
    packageType: 'monthly',
    product: {
      identifier: 'com.hkntzkprn.MedicineTrackerApp.monthly',
      title: 'Aylık Premium',
      description: 'Aylık premium abonelik',
      price: 29.99,
      priceString: '₺29,99',
      currencyCode: 'TRY',
    },
    localizedPriceString: '₺29,99',
  },
  {
    identifier: 'three_month_premium',
    packageType: 'three_month',
    product: {
      identifier: 'com.hkntzkprn.MedicineTrackerApp.threemonth',
      title: '3 Aylık Premium',
      description: '3 aylık premium abonelik',
      price: 74.99,
      priceString: '₺74,99',
      currencyCode: 'TRY',
    },
    localizedPriceString: '₺74,99',
  },
  {
    identifier: 'six_month_premium',
    packageType: 'six_month',
    product: {
      identifier: 'com.hkntzkprn.MedicineTrackerApp.sixmonth',
      title: '6 Aylık Premium',
      description: '6 aylık premium abonelik',
      price: 134.99,
      priceString: '₺134,99',
      currencyCode: 'TRY',
    },
    localizedPriceString: '₺134,99',
  },
  {
    identifier: 'annual_premium',
    packageType: 'annual',
    product: {
      identifier: 'com.hkntzkprn.MedicineTrackerApp.annual',
      title: 'Yıllık Premium',
      description: 'Yıllık premium abonelik',
      price: 199.99,
      priceString: '₺199,99',
      currencyCode: 'TRY',
    },
    localizedPriceString: '₺199,99',
  },
];

const PremiumModal: React.FC<PremiumModalProps> = ({
  visible,
  onClose,
  onPurchaseSuccess,
  currentMedicineCount = 0,
}) => {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (visible) {
      const remoteLogger = RemoteLogger.getInstance();
      remoteLogger.info('🎯 PremiumModal opened', { 
        visible, 
        currentMedicineCount,
        timestamp: new Date().toISOString() 
      });
      console.log('🎯 PremiumModal opened:', { visible, currentMedicineCount });
      
      loadPackages();
    } else {
      const remoteLogger = RemoteLogger.getInstance();
      remoteLogger.info('🚪 PremiumModal closed', { 
        visible,
        timestamp: new Date().toISOString() 
      });
      console.log('🚪 PremiumModal closed');
    }
  }, [visible]);

  const loadPackages = async () => {
    const remoteLogger = RemoteLogger.getInstance();
    
    remoteLogger.info('🔄 LoadPackages function started', {
      timestamp: new Date().toISOString(),
      loading: loading
    });
    console.log('🔄 LoadPackages function started');
    
    setLoading(true);
    
    try {
      remoteLogger.info('📝 Getting PurchaseManager instance...');
      console.log('📝 Getting PurchaseManager instance...');
      
      const purchaseManager = PurchaseManager.getInstance();
      
      remoteLogger.info('✅ PurchaseManager instance obtained');
      console.log('✅ PurchaseManager instance obtained');
      
      remoteLogger.info('🔄 Calling getAvailablePackages...');
      console.log('🔄 Calling getAvailablePackages...');
      
      let availablePackages = await purchaseManager.getAvailablePackages();
      
      remoteLogger.info('📦 getAvailablePackages completed', {
        count: availablePackages.length,
        hasPackages: availablePackages.length > 0,
        packageIds: availablePackages.map(p => p.identifier),
        packageTypes: availablePackages.map(p => p.packageType),
        prices: availablePackages.map(p => p.product.priceString),
        timestamp: new Date().toISOString()
      });
      
      console.log('📦 RevenueCat packages count:', availablePackages.length);
      console.log('📦 Package details:', availablePackages.map(p => ({
        id: p.identifier,
        type: p.packageType,
        productId: p.product.identifier,
        price: p.product.priceString,
        title: p.product.title
      })));
      
      // Eğer RevenueCat'ten paket alınamazsa mock data kullan
      if (availablePackages.length === 0) {
        remoteLogger.warn('⚠️ No RevenueCat packages found! Switching to mock data', {
          reason: 'Empty packages array from RevenueCat',
          mockPackagesCount: MOCK_PACKAGES.length,
          timestamp: new Date().toISOString()
        });
        
        console.warn('⚠️ No RevenueCat packages found! Using mock data.');
        console.log('🔧 RevenueCat troubleshooting checklist:');
        console.log('   1. API key: Check if correct');
        console.log('   2. Offering: Must be marked as "current"');
        console.log('   3. Product IDs: Must match App Store Connect exactly');
        console.log('   4. Bundle ID: Must match between App Store and RevenueCat');
        console.log('   5. Subscriptions: Must be "Ready to Submit" in App Store Connect');
        console.log('   6. Check PurchaseManager logs for initialization errors');
        
        availablePackages = MOCK_PACKAGES;
        
        remoteLogger.info('📝 Using mock packages', {
          mockPackagesCount: MOCK_PACKAGES.length,
          mockPackageIds: MOCK_PACKAGES.map(p => p.identifier),
          mockPrices: MOCK_PACKAGES.map(p => p.product.priceString)
        });
      } else {
        remoteLogger.info('✅ RevenueCat packages loaded successfully!', {
          count: availablePackages.length,
          source: 'RevenueCat API',
          timestamp: new Date().toISOString()
        });
        console.log('✅ RevenueCat packages loaded successfully!', availablePackages.length, 'packages found');
      }
      
      remoteLogger.info('🎯 Setting packages state', {
        packagesCount: availablePackages.length,
        isUsingMock: availablePackages === MOCK_PACKAGES
      });
      
      setPackages(availablePackages);
      
      // Varsayılan olarak yıllık paketi seç (en popüler)
      remoteLogger.info('🔍 Looking for annual package...');
      console.log('🔍 Looking for annual package...');
      
      const annualPackage = availablePackages.find(pkg => 
        pkg.packageType === 'annual' || pkg.identifier.toLowerCase().includes('annual')
      );
      
      if (annualPackage) {
        remoteLogger.info('✅ Annual package found and selected', {
          packageId: annualPackage.identifier,
          packageType: annualPackage.packageType,
          price: annualPackage.product.priceString
        });
        console.log('✅ Annual package selected:', annualPackage.identifier);
        setSelectedPackage(annualPackage);
      } else if (availablePackages.length > 0) {
        remoteLogger.info('⚠️ No annual package found, selecting first available', {
          selectedPackageId: availablePackages[0].identifier,
          selectedPackageType: availablePackages[0].packageType,
          allAvailableTypes: availablePackages.map(p => p.packageType)
        });
        console.log('⚠️ No annual package, selecting first:', availablePackages[0].identifier);
        setSelectedPackage(availablePackages[0]);
      } else {
        remoteLogger.warn('❌ No packages available to select');
        console.log('❌ No packages available to select');
      }
      
      remoteLogger.info('✅ LoadPackages completed successfully', {
        finalPackagesCount: availablePackages.length,
        selectedPackageId: annualPackage?.identifier || availablePackages[0]?.identifier || 'none',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      remoteLogger.error('❌ LoadPackages function error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
        timestamp: new Date().toISOString()
      });
      
      console.error('❌ RevenueCat package loading error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Hata durumunda da mock data kullan
      remoteLogger.info('🔄 Fallback to mock data due to error', {
        mockPackagesCount: MOCK_PACKAGES.length
      });
      
      setPackages(MOCK_PACKAGES);
      setSelectedPackage(MOCK_PACKAGES.find(pkg => pkg.packageType === 'annual') || MOCK_PACKAGES[0]);
    } finally {
      remoteLogger.info('🏁 LoadPackages finally block', {
        settingLoadingToFalse: true,
        timestamp: new Date().toISOString()
      });
      console.log('🏁 LoadPackages completed, setting loading to false');
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    const remoteLogger = RemoteLogger.getInstance();
    
    remoteLogger.info('🛒 HandlePurchase function started', {
      hasSelectedPackage: !!selectedPackage,
      selectedPackageId: selectedPackage?.identifier || 'none',
      timestamp: new Date().toISOString()
    });
    console.log('🛒 HandlePurchase function started');
    
    if (!selectedPackage) {
      remoteLogger.warn('❌ No package selected for purchase');
      console.log('❌ No package selected for purchase');
      Alert.alert('Hata', 'Lütfen bir abonelik paketi seçin.');
      return;
    }

    remoteLogger.info('📝 Purchase validation passed', {
      packageId: selectedPackage.identifier,
      packageType: selectedPackage.packageType,
      productId: selectedPackage.product.identifier,
      price: selectedPackage.product.priceString,
      title: selectedPackage.product.title
    });
    console.log('📝 Purchase validation passed for:', selectedPackage.identifier);
    
    remoteLogger.info('🔄 Setting purchasing state to true');
    console.log('🔄 Setting purchasing state to true');
    setPurchasing(true);
    
    try {
      remoteLogger.info('🛒 Starting purchase process', {
        packageId: selectedPackage.identifier,
        packageType: selectedPackage.packageType,
        productId: selectedPackage.product.identifier,
        price: selectedPackage.product.priceString,
        currencyCode: selectedPackage.product.currencyCode,
        timestamp: new Date().toISOString()
      });
      console.log('🛒 Starting purchase for:', {
        package: selectedPackage.identifier,
        product: selectedPackage.product.identifier,
        price: selectedPackage.product.priceString
      });
      
      remoteLogger.info('📝 Getting PurchaseManager instance for purchase...');
      console.log('📝 Getting PurchaseManager instance for purchase...');
      const purchaseManager = PurchaseManager.getInstance();
      
      remoteLogger.info('🔄 Calling purchaseSubscription...');
      console.log('🔄 Calling purchaseSubscription...');
      const success = await purchaseManager.purchaseSubscription(selectedPackage);
      
      remoteLogger.info('📊 Purchase attempt completed', {
        success: success,
        packageId: selectedPackage.identifier,
        timestamp: new Date().toISOString()
      });
      console.log('📊 Purchase attempt completed. Success:', success);
      
      if (success) {
        remoteLogger.info('✅ Purchase successful!', {
          packageId: selectedPackage.identifier,
          packageType: selectedPackage.packageType,
          price: selectedPackage.product.priceString,
          timestamp: new Date().toISOString()
        });
        console.log('✅ Purchase successful for:', selectedPackage.identifier);
        
        remoteLogger.info('🎉 Showing success alert');
        console.log('🎉 Showing success alert');
        
        Alert.alert(
          'Tebrikler! 🎉',
          'Premium aboneliğiniz başarıyla aktif edildi. Artık sınırsız ilaç ekleyebilirsiniz!',
          [
            {
              text: 'Harika!',
              onPress: () => {
                remoteLogger.info('👍 User acknowledged purchase success', {
                  packageId: selectedPackage.identifier
                });
                console.log('👍 User acknowledged purchase success');
                onPurchaseSuccess?.();
                onClose();
              },
            },
          ]
        );
      } else {
        remoteLogger.warn('❌ Purchase failed - returned false', {
          packageId: selectedPackage.identifier,
          reason: 'purchaseSubscription returned false',
          timestamp: new Date().toISOString()
        });
        console.log('❌ Purchase failed - purchaseSubscription returned false');
        
        remoteLogger.info('🚨 Showing purchase failure alert');
        Alert.alert(
          'Satın Alma Başarısız',
          'Abonelik satın alınırken bir hata oluştu. Lütfen tekrar deneyin.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                remoteLogger.info('👍 User acknowledged purchase failure');
                console.log('👍 User acknowledged purchase failure');
              }
            }
          ]
        );
      }
    } catch (error) {
      remoteLogger.error('❌ Purchase process error', {
        packageId: selectedPackage.identifier,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorCode: (error as any)?.code || 'no_code',
        timestamp: new Date().toISOString()
      });
      
      console.error('❌ Purchase process error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        code: (error as any)?.code || 'no_code',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      remoteLogger.info('🚨 Showing error alert to user');
      console.log('🚨 Showing error alert to user');
      
      Alert.alert(
        'Satın Alma Hatası',
        `Abonelik satın alınırken bir hata oluştu.\n\nHata: ${error instanceof Error ? error.message : String(error)}\n\nLütfen tekrar deneyin.`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              remoteLogger.info('👍 User acknowledged purchase error');
              console.log('👍 User acknowledged purchase error');
            }
          }
        ]
      );
    } finally {
      remoteLogger.info('🏁 Purchase process finally block', {
        settingPurchasingToFalse: true,
        timestamp: new Date().toISOString()
      });
      console.log('🏁 Purchase process completed, setting purchasing to false');
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    const remoteLogger = RemoteLogger.getInstance();
    
    remoteLogger.info('🔄 HandleRestore function started', {
      timestamp: new Date().toISOString()
    });
    console.log('🔄 HandleRestore function started');
    
    setLoading(true);
    remoteLogger.info('🔄 Setting loading state to true for restore');
    
    try {
      remoteLogger.info('📝 Getting PurchaseManager instance for restore...');
      console.log('📝 Getting PurchaseManager instance for restore...');
      
      const purchaseManager = PurchaseManager.getInstance();
      
      remoteLogger.info('🔄 Calling restorePurchases...');
      console.log('🔄 Calling restorePurchases...');
      
      const restored = await purchaseManager.restorePurchases();
      
      remoteLogger.info('📊 Restore attempt completed', {
        success: restored,
        timestamp: new Date().toISOString()
      });
      console.log('📊 Restore attempt completed. Success:', restored);
      
      if (restored) {
        remoteLogger.info('✅ Purchases restored successfully');
        console.log('✅ Purchases restored successfully');
        
        onPurchaseSuccess?.();
        onClose();
      } else {
        remoteLogger.warn('⚠️ No purchases found to restore');
        console.log('⚠️ No purchases found to restore');
        
        Alert.alert(
          'Geri Yükleme',
          'Geri yüklenecek satın alım bulunamadı.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                remoteLogger.info('👍 User acknowledged no purchases to restore');
                console.log('👍 User acknowledged no purchases to restore');
              }
            }
          ]
        );
      }
    } catch (error) {
      remoteLogger.error('❌ Restore process error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
        timestamp: new Date().toISOString()
      });
      
      console.error('❌ Restore process error:', error);
      
      Alert.alert(
        'Geri Yükleme Hatası',
        `Satın alımlar geri yüklenirken bir hata oluştu.\n\nHata: ${error instanceof Error ? error.message : String(error)}`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              remoteLogger.info('👍 User acknowledged restore error');
              console.log('👍 User acknowledged restore error');
            }
          }
        ]
      );
    } finally {
      remoteLogger.info('🏁 Restore process finally block', {
        settingLoadingToFalse: true,
        timestamp: new Date().toISOString()
      });
      console.log('🏁 Restore process completed, setting loading to false');
      setLoading(false);
    }
  };

  // Debug fonksiyonu - sadece development'ta göster
  const handleDebugRevenueCat = async () => {
    const remoteLogger = RemoteLogger.getInstance();
    
    remoteLogger.info('🧪 Debug test started', {
      timestamp: new Date().toISOString(),
      buildNumber: '10',
      platform: 'ios'
    });
    console.log('🧪 Debug test started');
    
    try {
      const purchaseManager = PurchaseManager.getInstance();
      
      remoteLogger.info('🔄 Running RevenueCat test...');
      console.log('🔄 Running RevenueCat test...');
      
      await purchaseManager.testRevenueCat();
      
      remoteLogger.info('✅ RevenueCat test completed');
      console.log('✅ RevenueCat test completed');
      
      // Logları hemen gönder
      remoteLogger.info('📤 Flushing logs to Firebase...');
      console.log('📤 Flushing logs to Firebase...');
      
      await remoteLogger.flush();
      
      remoteLogger.info('✅ Logs flushed to Firebase successfully');
      console.log('✅ Logs flushed to Firebase successfully');
      
    } catch (error) {
      remoteLogger.error('❌ Debug test error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Debug test error:', error);
    }
    
    Alert.alert(
      'Debug Test Tamamlandı',
      'RevenueCat test tamamlandı. Console logları Firebase\'e gönderildi.\n\nFirebase Console → Firestore → app_logs collection\'ından logları kontrol edebilirsiniz.',
      [
        {
          text: 'Tamam',
          onPress: () => {
            remoteLogger.info('👍 User acknowledged debug completion');
            console.log('👍 User acknowledged debug completion');
          }
        }
      ]
    );
  };

  const renderPackageCard = (pkg: SubscriptionPackage) => {
    const isSelected = selectedPackage?.identifier === pkg.identifier;
    const isPopular = pkg.packageType === 'annual' || pkg.identifier.toLowerCase().includes('annual');

    const handlePackageSelect = () => {
      const remoteLogger = RemoteLogger.getInstance();

      remoteLogger.info('📦 Package selected by user', {
        packageId: pkg.identifier,
        packageType: pkg.packageType,
        price: pkg.product.priceString,
        productId: pkg.product.identifier,
        wasSelected: isSelected,
        isPopular: isPopular,
        previousSelection: selectedPackage?.identifier || 'none',
        timestamp: new Date().toISOString()
      });

      console.log('📦 User selected package:', {
        id: pkg.identifier,
        type: pkg.packageType,
        price: pkg.product.priceString,
        wasAlreadySelected: isSelected
      });

      setSelectedPackage(pkg);
    };

    // Fiyatı ülkeye göre en doğru şekilde göster
    let displayPrice = pkg.localizedPriceString || pkg.product.priceString || 'Fiyat bulunamadı';
    let currency = pkg.product.currencyCode ? ` ${pkg.product.currencyCode}` : '';

    return (
      <TouchableOpacity
        key={pkg.identifier}
        style={[
          styles.packageCard,
          isSelected && styles.selectedPackageCard,
        ]}
        onPress={handlePackageSelect}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>EN POPÜLER</Text>
          </View>
        )}

        <View style={styles.packageHeader}>
          <Text style={styles.packageTitle}>
            {PurchaseManager.getSubscriptionTitle(pkg.packageType)}
          </Text>
          <Text style={styles.packagePrice}>
            {displayPrice}{currency}
          </Text>
        </View>

        <Text style={styles.packageBenefit}>
          {PurchaseManager.getSubscriptionBenefit(pkg.packageType)}
        </Text>

        <View style={styles.radioButton}>
          <View style={[
            styles.radioOuter,
            isSelected && styles.radioSelected
          ]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeature = (feature: typeof PREMIUM_FEATURES[0], index: number) => {
    const IconComponent = feature.iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons : MaterialIcons;
    
    return (
      <View key={index} style={styles.featureRow}>
        <IconComponent name={feature.icon as any} size={24} color={COLORS.primary} />
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        const remoteLogger = RemoteLogger.getInstance();
        remoteLogger.info('❌ Modal closed by user request', {
          timestamp: new Date().toISOString()
        });
        console.log('❌ Modal closed by user request');
        onClose();
      }}
    >
      <SafeAreaView style={styles.container}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => {
                const remoteLogger = RemoteLogger.getInstance();
                remoteLogger.info('❌ Modal closed by close button', {
                  timestamp: new Date().toISOString()
                });
                console.log('❌ Modal closed by close button');
                onClose();
              }} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <MaterialCommunityIcons name="crown" size={40} color="#FFD700" />
              <Text style={styles.headerTitle}>Premium'a Geçin</Text>
              <Text style={styles.headerSubtitle}>Sınırsız özellikler ile daha fazlası</Text>
            </View>
            
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Status */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusIcon}>
                <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statusTitle}>Mevcut Durumunuz</Text>
            </View>
            <Text style={styles.statusText}>
              {currentMedicineCount}/3 ilaç eklemiş bulunmaktasınız.
            </Text>
            <View style={styles.limitBar}>
              <View 
                style={[
                  styles.limitProgress, 
                  { width: `${(currentMedicineCount / 3) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Premium Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Özellikler</Text>
            {PREMIUM_FEATURES.map(renderFeature)}
          </View>

          {/* Subscription Packages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Abonelik Seçenekleri</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Paketler yükleniyor...</Text>
              </View>
            ) : (
              packages.map(renderPackageCard)
            )}
          </View>

          {/* Purchase Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                (purchasing || loading || !selectedPackage) && styles.disabledButton
              ]}
              onPress={handlePurchase}
              disabled={purchasing || loading || !selectedPackage}
            >
              {purchasing ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons name="crown" size={20} color="#FFFFFF" />
                  <Text style={styles.purchaseButtonText}>
                    Premium'a Başla
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={loading}
            >
              <Text style={styles.restoreButtonText}>
                Önceki Satın Alımları Geri Yükle
              </Text>
            </TouchableOpacity>

            {/* Debug Button - TestFlight için de göster */}
            <TouchableOpacity
              style={[styles.restoreButton, { backgroundColor: '#FF6B6B', marginTop: 10 }]}
              onPress={handleDebugRevenueCat}
            >
              <Text style={styles.restoreButtonText}>
                🧪 RevenueCat Debug Test
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Devam ederek Kullanım Şartları ve Gizlilik Politikası'nı kabul etmiş olursunuz.
              Abonelik otomatik olarak yenilenir ve iPtal edilene kadar devam eder.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  gradientHeader: {
    paddingVertical: SIZES.large,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: SIZES.base,
  },
  headerTitle: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginTop: SIZES.base,
  },
  headerSubtitle: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  statusCard: {
    backgroundColor: '#F8F9FF',
    padding: SIZES.large,
    borderRadius: SIZES.medium,
    marginTop: SIZES.large,
    marginBottom: SIZES.base,
    borderWidth: 1,
    borderColor: '#E1E5F2',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.medium,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.base,
  },
  statusTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.semiBold,
    color: COLORS.dark,
  },
  statusText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: SIZES.medium,
  },
  limitBar: {
    height: 8,
    backgroundColor: '#E1E5F2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  limitProgress: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  section: {
    marginVertical: SIZES.padding,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.dark,
    fontWeight: '600',
    marginBottom: SIZES.padding,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.padding,
  },
  featureText: {
    flex: 1,
    marginLeft: SIZES.padding,
  },
  featureTitle: {
    ...FONTS.body3,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  featureDescription: {
    ...FONTS.body4,
    color: COLORS.gray,
    lineHeight: 18,
  },
  packageCard: {
    backgroundColor: COLORS.white,
    padding: SIZES.large,
    borderRadius: SIZES.medium,
    marginBottom: SIZES.medium,
    borderWidth: 2,
    borderColor: '#E1E5F2',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedPackageCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#F8F9FF',
    shadowOpacity: 0.1,
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#FFD700',
    paddingHorizontal: SIZES.medium,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#333333',
    letterSpacing: 0.5,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  packageTitle: {
    ...FONTS.body2,
    fontWeight: '600',
    color: COLORS.dark,
  },
  packagePrice: {
    ...FONTS.body2,
    fontWeight: '700',
    color: COLORS.primary,
  },
  packageBenefit: {
    ...FONTS.body4,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  radioButton: {
    position: 'absolute',
    top: SIZES.padding,
    right: SIZES.padding,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.padding * 2,
  },
  loadingText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginTop: SIZES.base,
  },
  buttonContainer: {
    marginVertical: SIZES.padding,
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.large,
    borderRadius: SIZES.medium,
    alignItems: 'center',
    marginBottom: SIZES.base,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
  },
  purchaseButtonText: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginHorizontal: SIZES.base,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: SIZES.base,
  },
  restoreButtonText: {
    ...FONTS.body4,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  termsContainer: {
    paddingVertical: SIZES.padding,
    paddingBottom: SIZES.padding * 2,
  },
  termsText: {
    ...FONTS.caption,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PremiumModal;
