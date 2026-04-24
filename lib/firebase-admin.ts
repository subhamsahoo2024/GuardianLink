import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
);
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const hasAdminConfig = Boolean(clientEmail && privateKey && projectId);

const adminApp =
  hasAdminConfig && getApps().length === 0
    ? initializeApp({
        credential: cert({
          clientEmail: clientEmail!,
          privateKey: privateKey!,
          projectId: projectId!,
        }),
      })
    : getApps()[0] || null;

export const isFirebaseAdminConfigured = hasAdminConfig && Boolean(adminApp);

export const adminDb = adminApp ? getFirestore(adminApp) : null;
