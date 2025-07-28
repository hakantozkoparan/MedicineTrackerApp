import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';
import PurchaseManager, { SubscriptionPackage } from '@/services/PurchaseManager';
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

type PremiumFeature = {
  icon: string;
  iconFamily: 'MaterialIcons' | 'MaterialCommunityIcons';
  titleKey: keyof typeof import('@/locales/tr').default;
  descriptionKey: keyof typeof import('@/locales/tr').default;
};

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: 'medical-services',
    iconFamily: 'MaterialIcons',
    titleKey: 'premiumFeature_unlimitedMedicine_title',
    descriptionKey: 'premiumFeature_unlimitedMedicine_desc',
  },
  {
    icon: 'robot',
    iconFamily: 'MaterialCommunityIcons',
    titleKey: 'premiumFeature_aiChat_title',
    descriptionKey: 'premiumFeature_aiChat_desc',
  },
  {
    icon: 'movie-remove',
    iconFamily: 'MaterialCommunityIcons',
    titleKey: 'premiumFeature_adFree_title',
    descriptionKey: 'premiumFeature_adFree_desc',
  },
  {
    icon: 'support-agent',
    iconFamily: 'MaterialIcons',
    titleKey: 'premiumFeature_support_title',
    descriptionKey: 'premiumFeature_support_desc',
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
  const { t } = useLocalization();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPackages();
    }
  }, [visible]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const purchaseManager = PurchaseManager.getInstance();
      let availablePackages = await purchaseManager.getAvailablePackages();
      if (availablePackages.length === 0) {
        availablePackages = MOCK_PACKAGES;
      }
      setPackages(availablePackages);
      const annualPackage = availablePackages.find(pkg => 
        pkg.packageType === 'annual' || pkg.identifier.toLowerCase().includes('annual')
      );
      if (annualPackage) {
        setSelectedPackage(annualPackage);
      } else if (availablePackages.length > 0) {
        setSelectedPackage(availablePackages[0]);
      }
    } catch (error) {
      setPackages(MOCK_PACKAGES);
      setSelectedPackage(MOCK_PACKAGES.find(pkg => pkg.packageType === 'annual') || MOCK_PACKAGES[0]);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert(t('error'), t('selectSubscriptionPackage'));
      return;
    }
    setPurchasing(true);
    try {
      const purchaseManager = PurchaseManager.getInstance();
      const success = await purchaseManager.purchaseSubscription(selectedPackage);
      if (success) {
        Alert.alert(
          t('congrats'),
          t('premiumActivated'),
          [
            {
              text: t('awesome'),
              onPress: () => {
                onPurchaseSuccess?.();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t('purchaseFailed'),
          t('purchaseError'),
          [
            {
              text: t('ok'),
              onPress: () => {}
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        t('purchaseErrorTitle'),
        `${t('purchaseErrorDetail')}\n\n${error instanceof Error ? error.message : String(error)}\n\n${t('tryAgain')}`,
        [
          {
            text: t('ok'),
            onPress: () => {}
          }
        ]
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const purchaseManager = PurchaseManager.getInstance();
      const restored = await purchaseManager.restorePurchases();
      if (restored) {
        onPurchaseSuccess?.();
        onClose();
      } else {
        Alert.alert(
          t('restoreTitle'),
          t('restoreNotFound'),
          [
            {
              text: t('ok'),
              onPress: () => {}
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        t('restoreErrorTitle'),
        `${t('restoreErrorDetail')}\n\n${error instanceof Error ? error.message : String(error)}`,
        [
          {
            text: t('ok'),
            onPress: () => {}
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPackageCard = (pkg: SubscriptionPackage) => {
    const isSelected = selectedPackage?.identifier === pkg.identifier;
    const isPopular = pkg.packageType === 'annual' || pkg.identifier.toLowerCase().includes('annual');

    const handlePackageSelect = () => {
      setSelectedPackage(pkg);
    };

    // Fiyat ve para birimi logu
    const paketLog = {
      identifier: pkg.identifier,
      localizedPriceString: pkg.localizedPriceString,
      priceString: pkg.product.priceString,
      currencyCode: pkg.product.currencyCode,
      product: pkg.product,
      timestamp: new Date().toISOString(),
    };
    console.log('PAKET:', paketLog);

    // Firestore'a gönder
    try {
      const { firestore } = require('@/api/firebase');
      firestore()
        .collection('app_logs')
        .add(paketLog);
    } catch (e) {
      // Firestore hatası sessizce geç
    }
    let displayPrice = pkg.localizedPriceString || pkg.product.priceString || t('priceNotFound');
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
            <Text style={styles.popularBadgeText}>{t('mostPopular')}</Text>
          </View>
        )}

        <View style={styles.packageContent}>
          <View style={styles.packageInfo}>
            <Text style={styles.packageTitle}>
              {t(`subscriptionTitle_${pkg.packageType}` as any)}
            </Text>
            <Text style={styles.packageBenefit}>
              {t(`subscriptionBenefit_${pkg.packageType}` as any)}
            </Text>
          </View>

          <View style={styles.packageRight}>
            <Text style={styles.packagePrice}>
              {displayPrice}{currency}
            </Text>
            <View style={styles.radioButton}>
              <View style={[
                styles.radioOuter,
                isSelected && styles.radioSelected
              ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </View>
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
          <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
          <Text style={styles.featureDescription}>{t(feature.descriptionKey)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <MaterialCommunityIcons name="crown" size={40} color="#FFD700" />
              <Text style={styles.headerTitle}>{t('goPremium')}</Text>
              <Text style={styles.headerSubtitle}>{t('moreFeatures')}</Text>
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
              <Text style={styles.statusTitle}>{t('currentStatus')}</Text>
            </View>
            <Text style={styles.statusText}>
              {t('currentMedicineCount').replace('{count}', String(currentMedicineCount)).replace('{limit}', '3')}
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
            <Text style={styles.sectionTitle}>{t('premiumFeatures')}</Text>
            {PREMIUM_FEATURES.map(renderFeature)}
          </View>

          {/* Subscription Packages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('subscriptionOptions')}</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>{t('loadingPackages')}</Text>
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
                    {t('startPremium')}
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
                {t('restorePurchases')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              {t('acceptTerms')}
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
  packageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageInfo: {
    flex: 1,
    paddingRight: SIZES.medium,
  },
  packageRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    marginBottom: 4,
  },
  packagePrice: {
    ...FONTS.body2,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: SIZES.base,
    textAlign: 'right',
  },
  packageBenefit: {
    ...FONTS.body4,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  radioButton: {
    alignItems: 'center',
    justifyContent: 'center',
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

// PremiumModal artık navigation ile açılmıyor, state ile açılıp kapatılıyor.
// AIChatScreen'de şöyle kullanılmalı:
//
// import PremiumModal from '@/components/PremiumModal';
// const [premiumModalVisible, setPremiumModalVisible] = useState(false);
// ...
// <PremiumModal visible={premiumModalVisible} onClose={() => setPremiumModalVisible(false)} />
// ...
// Premium butonuna tıklanınca: setPremiumModalVisible(true)

export default PremiumModal;
