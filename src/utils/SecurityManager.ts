import { db } from '@/api/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';

export interface SecurityAttempt {
  deviceId: string;
  deviceInfo: {
    osName: string | null;
    osVersion: string | null;
    deviceName: string | null;
    modelName: string | null;
    locale?: string; // tr-TR, en-US gibi
    region?: string; // TR, US gibi ülke kodu  
    timezone?: string; // Europe/Istanbul gibi
  };
  ipAddress?: string;
  attempts: {
    timestamp: Timestamp | Date;
    type: 'login' | 'register';
    email?: string;
    success: boolean;
  }[];
  totalAttempts: number;
  blockedUntil?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

class SecurityManager {
  private static instance: SecurityManager;
  private deviceId: string | null = null;

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // Cihaz kimliği oluştur/al
  async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    try {
      // AsyncStorage'dan mevcut device ID'yi al
      let deviceId = await AsyncStorage.getItem('device_id');
      
      if (!deviceId) {
        // Yeni device ID oluştur (UUID benzeri)
        deviceId = this.generateDeviceId();
        await AsyncStorage.setItem('device_id', deviceId);
      }
      
      this.deviceId = deviceId;
      return deviceId;
    } catch (error) {
      console.error('Device ID alınamadı:', error);
      // Fallback olarak geçici ID oluştur
      this.deviceId = this.generateDeviceId();
      return this.deviceId;
    }
  }

  private generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${randomStr}`;
  }

  // Cihaz bilgilerini al
  async getDeviceInfo() {
    try {
      return {
        osName: Device.osName,
        osVersion: Device.osVersion,
        deviceName: Device.deviceName,
        modelName: Device.modelName,
        locale: Localization.getLocales()[0]?.languageTag || 'en-US', // tr-TR, en-US gibi
        region: Localization.getLocales()[0]?.regionCode || 'US', // TR, US gibi ülke kodu
        timezone: Localization.getCalendars()[0]?.timeZone || 'UTC', // Europe/Istanbul gibi
      };
    } catch (error) {
      // Localization hatası durumunda varsayılan değerler
      return {
        osName: Device.osName,
        osVersion: Device.osVersion,
        deviceName: Device.deviceName,
        modelName: Device.modelName,
        locale: 'en-US',
        region: 'US',
        timezone: 'UTC',
      };
    }
  }

  // Güvenlik kontrolü - giriş/kayıt öncesi
  async checkSecurityLimits(type: 'login' | 'register', email?: string): Promise<{
    allowed: boolean;
    reason?: string;
    waitTime?: number; // dakika cinsinden
  }> {
    try {
      if (!db) {
        return { allowed: true }; // DB yoksa izin ver
      }
      
      const deviceId = await this.getDeviceId();
      const securityDocRef = doc(db, 'security_attempts', deviceId);
      const securityDoc = await getDoc(securityDocRef);

      const now = new Date();
      const oneHour = 60 * 60 * 1000; // 1 saat ms
      const oneDay = 24 * 60 * 60 * 1000; // 1 gün ms

      if (securityDoc.exists()) {
        const data = securityDoc.data() as SecurityAttempt;
        
        // Eğer cihaz bloklanmışsa kontrol et
        if (data.blockedUntil) {
          const blockedUntilDate = data.blockedUntil instanceof Timestamp ? data.blockedUntil.toDate() : data.blockedUntil;
          if (blockedUntilDate > now) {
            const waitTime = Math.ceil((blockedUntilDate.getTime() - now.getTime()) / (60 * 1000));
            return {
              allowed: false,
              reason: 'Çok fazla başarısız deneme nedeniyle cihazınız geçici olarak engellenmiştir.',
              waitTime
            };
          }
        }

        // Son 1 saat içindeki denemeleri say
        const recentAttempts = data.attempts.filter(attempt => {
          const attemptDate = attempt.timestamp instanceof Timestamp ? attempt.timestamp.toDate() : attempt.timestamp;
          return (now.getTime() - attemptDate.getTime()) < oneHour;
        });

        // Son 1 gün içindeki denemeleri say
        const dailyAttempts = data.attempts.filter(attempt => {
          const attemptDate = attempt.timestamp instanceof Timestamp ? attempt.timestamp.toDate() : attempt.timestamp;
          return (now.getTime() - attemptDate.getTime()) < oneDay;
        });

        // Saatlik limitler
        const hourlyLoginAttempts = recentAttempts.filter(a => a.type === 'login').length;
        const hourlyRegisterAttempts = recentAttempts.filter(a => a.type === 'register').length;

        // Günlük limitler
        const dailyLoginAttempts = dailyAttempts.filter(a => a.type === 'login').length;
        const dailyRegisterAttempts = dailyAttempts.filter(a => a.type === 'register').length;

        // Başarısız denemeler
        const failedAttemptsLastHour = recentAttempts.filter(a => !a.success).length;

        // Limit kontrolleri
        if (type === 'login') {
          if (hourlyLoginAttempts >= 100) { // Geçici olarak yükseltildi
            return {
              allowed: false,
              reason: 'Saatlik giriş deneme limitini aştınız. Lütfen daha sonra tekrar deneyin.',
              waitTime: 60
            };
          }
          if (dailyLoginAttempts >= 500) { // Geçici olarak yükseltildi
            return {
              allowed: false,
              reason: 'Günlük giriş deneme limitini aştınız.',
              waitTime: 24 * 60
            };
          }
        }

        if (type === 'register') {
          if (hourlyRegisterAttempts >= 100) { // Geçici olarak yükseltildi
            return {
              allowed: false,
              reason: 'Saatlik kayıt deneme limitini aştınız. Lütfen daha sonra tekrar deneyin.',
              waitTime: 60
            };
          }
          if (dailyRegisterAttempts >= 100) { // Geçici olarak yükseltildi
            return {
              allowed: false,
              reason: 'Günlük kayıt deneme limitini aştınız.',
              waitTime: 24 * 60
            };
          }
        }

        // Çok fazla başarısız deneme kontrolü
        if (failedAttemptsLastHour >= 15) {
          // 1 saat blokla
          const blockedUntil = new Date(now.getTime() + oneHour);
          await updateDoc(securityDocRef, {
            blockedUntil: Timestamp.fromDate(blockedUntil),
            updatedAt: Timestamp.fromDate(now)
          });

          return {
            allowed: false,
            reason: 'Çok fazla başarısız deneme nedeniyle 1 saat süreyle engellendiniz.',
            waitTime: 60
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Güvenlik kontrolü hatası:', error);
      // Hata durumunda izin ver ama logla
      return { allowed: true };
    }
  }

  // Deneme kaydı oluştur
  async recordAttempt(type: 'login' | 'register', success: boolean, email?: string): Promise<void> {
    try {
      if (!db) {
        console.warn('Database not available, skipping attempt record');
        return;
      }
      
      const deviceId = await this.getDeviceId();
      const deviceInfo = await this.getDeviceInfo();
      const now = new Date();
      
      const securityDocRef = doc(db, 'security_attempts', deviceId);
      const securityDoc = await getDoc(securityDocRef);

      const newAttempt = {
        timestamp: now,
        type,
        email,
        success
      };

      if (securityDoc.exists()) {
        const data = securityDoc.data() as SecurityAttempt;
        
        // Son 30 günün denemelerini tut, eskilerini sil
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const filteredAttempts = data.attempts.filter(attempt => {
          const attemptDate = attempt.timestamp instanceof Timestamp ? attempt.timestamp.toDate() : attempt.timestamp;
          return attemptDate.getTime() > thirtyDaysAgo.getTime();
        });

        await updateDoc(securityDocRef, {
          attempts: [...filteredAttempts, newAttempt],
          totalAttempts: data.totalAttempts + 1,
          updatedAt: Timestamp.fromDate(now),
          deviceInfo // Cihaz bilgilerini güncelle
        });
      } else {
        // İlk deneme kaydı
        const securityData: SecurityAttempt = {
          deviceId,
          deviceInfo,
          attempts: [newAttempt],
          totalAttempts: 1,
          createdAt: now,
          updatedAt: now
        };

        await setDoc(securityDocRef, {
          ...securityData,
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now)
        });
      }
    } catch (error) {
      console.error('Deneme kaydı oluşturulamadı:', error);
    }
  }

  // Admin için: Şüpheli cihazları listele
  async getSuspiciousDevices(): Promise<SecurityAttempt[]> {
    try {
      if (!db) {
        console.warn('Database not available, returning empty suspicious devices list');
        return [];
      }
      
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      
      const securityQuery = query(collection(db, 'security_attempts'));
      const querySnapshot = await getDocs(securityQuery);
      
      const suspiciousDevices: SecurityAttempt[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as SecurityAttempt;
        
        // Son 24 saatteki başarısız denemeler
        const recentFailedAttempts = data.attempts.filter(attempt => {
          const attemptDate = attempt.timestamp instanceof Timestamp ? attempt.timestamp.toDate() : attempt.timestamp;
          return !attempt.success && (now.getTime() - attemptDate.getTime()) < oneDay;
        }).length;
        
        // Şüpheli kriterler - test için düşürülmüş
        if (recentFailedAttempts >= 1 || data.totalAttempts >= 3) {
          suspiciousDevices.push(data);
        }
      });
      
      return suspiciousDevices.sort((a, b) => {
        const aDate = a.updatedAt instanceof Timestamp ? a.updatedAt.toDate() : a.updatedAt;
        const bDate = b.updatedAt instanceof Timestamp ? b.updatedAt.toDate() : b.updatedAt;
        return bDate.getTime() - aDate.getTime();
      });
    } catch (error) {
      console.error('Şüpheli cihazlar alınamadı:', error);
      return [];
    }
  }

  // DEBUG: Test için sahte deneme kayıtları oluştur
  async createTestData(): Promise<void> {
    try {
      if (!db) {
        console.warn('Database not available, skipping test data creation');
        return;
      }
      
      const deviceId = await this.getDeviceId();
      const deviceInfo = await this.getDeviceInfo();
      const now = new Date();
      
      const testAttempts = [];
      
      // Son 1 saat içinde 15 başarısız deneme oluştur
      for (let i = 0; i < 15; i++) {
        testAttempts.push({
          timestamp: new Date(now.getTime() - (i * 3 * 60 * 1000)), // 3'er dakika arayla
          type: 'login' as const,
          email: 'test@example.com',
          success: false
        });
      }
      
      // Son 1 saat içinde 5 başarısız register denemesi
      for (let i = 0; i < 5; i++) {
        testAttempts.push({
          timestamp: new Date(now.getTime() - (i * 4 * 60 * 1000)), // 4'er dakika arayla
          type: 'register' as const,
          email: 'test@example.com',
          success: false
        });
      }
      
      // 2 başarılı deneme de ekle
      testAttempts.push({
        timestamp: new Date(now.getTime() - (30 * 60 * 1000)),
        type: 'login' as const,
        email: 'test@example.com',
        success: true
      });
      
      const securityDocRef = doc(db, 'security_attempts', deviceId);
      const securityData = {
        deviceId,
        deviceInfo,
        attempts: testAttempts,
        totalAttempts: testAttempts.length,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };

      await setDoc(securityDocRef, securityData);
    } catch (error) {
      console.error('❌ Test verileri oluşturulamadı:', error);
    }
  }

  // Cihaz engelini kaldır (admin)
  async unblockDevice(deviceId: string): Promise<boolean> {
    try {
      if (!db) {
        console.warn('Database not available, cannot unblock device');
        return false;
      }
      
      const securityDocRef = doc(db, 'security_attempts', deviceId);
      const securityDoc = await getDoc(securityDocRef);
      
      if (securityDoc.exists()) {
        // Engeli kaldır ve deneme geçmişini temizle
        await updateDoc(securityDocRef, {
          blockedUntil: null,
          attempts: [], // Tüm deneme geçmişini temizle
          totalAttempts: 0, // Toplam deneme sayısını sıfırla
          updatedAt: Timestamp.fromDate(new Date())
        });
      } else {
        // Doküman yoksa da başarılı say
      }
      
      return true;
    } catch (error) {
      console.error('❌ Cihaz engeli kaldırılamadı:', error);
      return false;
    }
  }

  // Günlük destek talebi limitini kontrol et
  async checkSupportTicketLimit(): Promise<{ allowed: boolean; reason?: string; remainingRequests?: number }> {
    try {
      if (!db) {
        console.warn('Database not available, blocking support ticket');
        return {
          allowed: false,
          reason: 'Sistem hatası nedeniyle şu anda talep gönderilemiyor. Lütfen daha sonra tekrar deneyin.'
        };
      }
      
      const deviceId = await this.getDeviceId();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // support_tickets koleksyonunda bugün bu cihazdan kaç talep açıldığını kontrol et
      const q = query(
        collection(db, 'support_tickets'),
        where('deviceId', '==', deviceId),
        where('createdAt', '>=', Timestamp.fromDate(oneDayAgo))
      );
      
      const querySnapshot = await getDocs(q);
      const todayRequestCount = querySnapshot.size;
      
      const DAILY_LIMIT = 3;
      const remainingRequests = DAILY_LIMIT - todayRequestCount;
      
      if (todayRequestCount >= DAILY_LIMIT) {
        return {
          allowed: false,
          reason: `Günlük destek talebi limitini aştınız (${DAILY_LIMIT} talep/gün). Lütfen yarın tekrar deneyin.`,
          remainingRequests: 0
        };
      }
      
      return {
        allowed: true,
        remainingRequests
      };
      
    } catch (error) {
      console.error('Destek talebi limit kontrolü hatası:', error);
      // Hata durumunda güvenlik nedeniyle izin verme
      return {
        allowed: false,
        reason: 'Sistem hatası nedeniyle şu anda talep gönderilemiyor. Lütfen daha sonra tekrar deneyin.'
      };
    }
  }

  // Destek talebini kaydet (deviceId ile)
  async recordSupportTicket(ticketData: any): Promise<boolean> {
    try {
      if (!db) {
        console.warn('Database not available, cannot record support ticket');
        return false;
      }
      
      const deviceId = await this.getDeviceId();
      
      // Talep verilerini cihaz ID'si ile birlikte kaydet
      const ticketWithDevice = {
        ...ticketData,
        deviceId,
        createdAt: Timestamp.fromDate(new Date())
      };
      
      // support_tickets koleksyonuna kaydet
      const docRef = doc(collection(db, 'support_tickets'));
      await setDoc(docRef, ticketWithDevice);
      
      return true;
    } catch (error) {
      console.error('Destek talebi kayıt hatası:', error);
      return false;
    }
  }
}

export default SecurityManager;
