import { auth, db } from '@/api/firebase';
import PurchaseManager, { PremiumStatus } from '@/services/PurchaseManager';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

const FREE_PLAN_MEDICINE_LIMIT = 3;

export interface PremiumLimitInfo {
  isPremium: boolean;
  medicineCount: number;
  medicineLimit: number | null; // null = sınırsız
  canAddMedicine: boolean;
  remainingMedicines: number;
  premiumStatus?: PremiumStatus;
}

export const usePremiumLimit = () => {
  const [limitInfo, setLimitInfo] = useState<PremiumLimitInfo>({
    isPremium: false,
    medicineCount: 0,
    medicineLimit: FREE_PLAN_MEDICINE_LIMIT,
    canAddMedicine: true,
    remainingMedicines: FREE_PLAN_MEDICINE_LIMIT,
  });
  const [loading, setLoading] = useState(true);

  // İlaç sayısını ve premium durumunu kontrol et
  const checkLimits = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Premium durumunu kontrol et
      const purchaseManager = PurchaseManager.getInstance();
      const premiumStatus = await purchaseManager.getCurrentPremiumStatus();

      // Kullanıcının toplam eklediği ilaç sayısını al (aktif/pasif fark etmez)
      const medicinesRef = collection(db, 'users', user.uid, 'medicines');
      
      const medicinesSnapshot = await getDocs(medicinesRef);
      const medicineCount = medicinesSnapshot.size;

      const isPremium = premiumStatus.isPremium;
      const medicineLimit = isPremium ? null : FREE_PLAN_MEDICINE_LIMIT;
      const canAddMedicine = isPremium || medicineCount < FREE_PLAN_MEDICINE_LIMIT;
      const remainingMedicines = isPremium ? 999 : Math.max(0, FREE_PLAN_MEDICINE_LIMIT - medicineCount);

      setLimitInfo({
        isPremium,
        medicineCount,
        medicineLimit,
        canAddMedicine,
        remainingMedicines,
        premiumStatus,
      });

    } catch (error) {
      console.error('Premium limit kontrolü hatası:', error);
      // Hata durumunda güvenli değerler kullan
      setLimitInfo({
        isPremium: false,
        medicineCount: 0,
        medicineLimit: FREE_PLAN_MEDICINE_LIMIT,
        canAddMedicine: true,
        remainingMedicines: FREE_PLAN_MEDICINE_LIMIT,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // İlaç değişikliklerini gerçek zamanlı takip et
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const medicinesRef = collection(db, 'users', user.uid, 'medicines');

    const unsubscribe = onSnapshot(
      medicinesRef,
      (snapshot) => {
        // İlaç sayısı değiştiğinde limitleri yeniden kontrol et
        checkLimits();
      },
      (error) => {
        console.error('İlaç değişiklikleri takip hatası:', error);
      }
    );

    // İlk kontrol
    checkLimits();

    return () => unsubscribe();
  }, [checkLimits]);

  // Premium satın alındığında manual refresh
  const refreshPremiumStatus = useCallback(() => {
    checkLimits();
  }, [checkLimits]);

  return {
    ...limitInfo,
    loading,
    refreshPremiumStatus,
  };
};

export default usePremiumLimit;
