declare module '@/api/firebase' {
  import { FirebaseApp } from 'firebase/app';
    import { Auth } from 'firebase/auth';
    import { Firestore } from 'firebase/firestore';
  export const app: FirebaseApp | null;
  export const auth: Auth | null;
  export const db: Firestore | null;
}
