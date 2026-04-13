/**
 * One-off migration: copies legacy root collections into a single tenant.
 *
 * Prerequisites:
 * - GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON
 * - firebase-admin installed (run from repo root: npx tsx scripts/migrate-to-multitenant.ts)
 *
 * Usage:
 *   DEFAULT_COMPANY_ID=my-tenant-id npx tsx scripts/migrate-to-multitenant.ts
 *
 * After running, assign users to the tenant (memberships + custom claims) via Cloud Functions
 * or Firebase Console. This script does not modify Auth custom claims.
 */

import { readFileSync } from 'node:fs';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || 'ai-studio-4eed925e-a375-4f96-a5c2-f845a152f2af';
const DEFAULT_COMPANY_ID = process.env.DEFAULT_COMPANY_ID || 'default';

async function copyCollection(
  db: Firestore,
  fromPath: string,
  toPath: string
): Promise<number> {
  const snap = await db.collection(fromPath).get();
  let n = 0;
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  };
  for (const doc of snap.docs) {
    batch.set(db.doc(`${toPath}/${doc.id}`), doc.data());
    n++;
    ops++;
    if (ops >= batchSize) await flush();
  }
  await flush();
  return n;
}

async function copyPoolsWithVisits(
  db: Firestore,
  companyId: string
): Promise<{ pools: number; visits: number }> {
  const poolsSnap = await db.collection('pools').get();
  let visits = 0;
  for (const p of poolsSnap.docs) {
    await db.doc(`companies/${companyId}/pools/${p.id}`).set(p.data());
    const vSnap = await db.collection('pools').doc(p.id).collection('visits').get();
    for (const v of vSnap.docs) {
      await db.doc(`companies/${companyId}/pools/${p.id}/visits/${v.id}`).set(v.data());
      visits++;
    }
  }
  return { pools: poolsSnap.size, visits };
}

async function main() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8')) as Record<string, unknown>;
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp({ credential: applicationDefault() });
  }

  const app = getApps()[0]!;
  const db = getFirestore(app, DATABASE_ID);
  const companyId = DEFAULT_COMPANY_ID;

  await db.doc(`companies/${companyId}`).set(
    {
      name: 'Migrated workspace',
      status: 'active',
      migratedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const routes = await copyCollection(db, 'routes', `companies/${companyId}/routes`);
  const logs = await copyCollection(db, 'logs', `companies/${companyId}/logs`);
  const { pools, visits } = await copyPoolsWithVisits(db, companyId);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        companyId,
        pools,
        visits,
        routes,
        logs,
        nextSteps: [
          'Deploy Cloud Functions and create memberships for each user (or use Firebase Console).',
          `Set custom claims: activeCompanyId=${companyId}, role=admin|supervisor|technician|client`,
        ],
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
