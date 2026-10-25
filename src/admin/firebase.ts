import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export interface ResolvedFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
}

const hasProvisionedAppletConfig = Boolean(
  appletConfig.apiKey &&
    appletConfig.projectId &&
    appletConfig.projectId !== 'remixed-project-id'
);

const envProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
const envDatabaseId = (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '').trim();

/**
 * Use the provisioned firebase-applet-config.json directly whenever it is configured
 * for the active project so environment defaults like VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
 * cannot override the provisioned named Firestore database instance.
 */
const useExternalEnvOverride = Boolean(
  envProjectId && (!hasProvisionedAppletConfig || envProjectId !== appletConfig.projectId)
);

const resolvedDatabaseId = useExternalEnvOverride
  ? envDatabaseId && envDatabaseId !== '(default)'
    ? envDatabaseId
    : undefined
  : appletConfig.firestoreDatabaseId ||
    (envDatabaseId && envDatabaseId !== '(default)' ? envDatabaseId : undefined);

export const resolvedConfig: ResolvedFirebaseConfig = useExternalEnvOverride
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
      messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
      firestoreDatabaseId: resolvedDatabaseId,
    }
  : {
      apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: appletConfig.projectId || envProjectId,
      storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId:
        appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
      firestoreDatabaseId: resolvedDatabaseId,
    };

export const isFirebaseConfigured = Boolean(
  resolvedConfig.apiKey &&
    resolvedConfig.projectId &&
    resolvedConfig.projectId !== 'remixed-project-id'
);

const app = initializeApp(resolvedConfig);

export const db =
  resolvedConfig.firestoreDatabaseId && resolvedConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, resolvedConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const BOOTSTRAPPED_ADMIN_EMAIL = 'carternoah060@gmail.com';

async function testConnection(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
