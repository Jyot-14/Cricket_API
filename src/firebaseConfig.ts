import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
import serviceAccount from '../key.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  storageBucket: 'my11-6b9a0.appspot.com',
});

const bucket = admin.storage().bucket();
const db = admin.firestore();

export { db, bucket };
