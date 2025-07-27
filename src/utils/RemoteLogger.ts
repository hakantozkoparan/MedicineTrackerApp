import { addDoc, collection } from 'firebase/firestore';

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: string | null; // undefined yerine null kullan
  timestamp: Date;
  platform: string;
  buildNumber: string;
}

class RemoteLogger {
  private static instance: RemoteLogger;
  private logQueue: LogEntry[] = [];
  private isUploading = false;

  static getInstance(): RemoteLogger {
    if (!RemoteLogger.instance) {
      RemoteLogger.instance = new RemoteLogger();
    }
    return RemoteLogger.instance;
  }

  private async uploadLogs() {
    if (this.isUploading || this.logQueue.length === 0) return;
    
    this.isUploading = true;
    try {
      // Firebase'i dynamic import ile al - TypeScript hatası için any kullan
      const firebase = await import('@/api/firebase');
      const db: any = firebase.db;
      
      const logsToUpload = [...this.logQueue];
      this.logQueue = [];
      
      // Firestore'a toplu gönder
      for (const log of logsToUpload) {
        // Firestore için undefined değerleri temizle
        const cleanLog = {
          level: log.level,
          message: log.message,
          timestamp: log.timestamp,
          platform: log.platform,
          buildNumber: log.buildNumber,
          ...(log.data && { data: log.data }) // data null/undefined değilse ekle
        };
        
        await addDoc(collection(db, 'app_logs'), cleanLog);
      }
      
    } catch (error) {
      // Başarısız logları geri koy
      this.logQueue.unshift(...this.logQueue);
    } finally {
      this.isUploading = false;
    }
  }

  log(level: LogEntry['level'], message: string, data?: any) {
    const logEntry: LogEntry = {
      level,
      message,
      data: data ? JSON.stringify(data) : null, // undefined yerine null kullan
      timestamp: new Date(),
      platform: 'ios',
      buildNumber: '10' // App.json'dan alınabilir
    };

    // Local console'a da yazdır
    
    // Queue'ya ekle
    this.logQueue.push(logEntry);
    
    // 5 log birikince veya error olunca hemen gönder
    if (this.logQueue.length >= 5 || level === 'error') {
      this.uploadLogs();
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  // Uygulama kapanırken kalan logları gönder
  async flush() {
    if (this.logQueue.length > 0) {
      await this.uploadLogs();
    }
  }
}

export default RemoteLogger;
