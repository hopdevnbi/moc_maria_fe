#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Demonstration catalog only: no user, certificate, verification or booking rows.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '..', 'moc_maria_be');
const backendRequire = createRequire(path.join(backend, 'package.json'));
const { Client } = backendRequire('pg');
backendRequire('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const profiles = JSON.parse(
  fs.readFileSync(path.join(frontend, 'src', 'features', 'mobile', 'demo-ktvs.json'), 'utf8'),
);

if (
  !Array.isArray(profiles) ||
  profiles.length !== 10 ||
  profiles.some(
    (profile, index) =>
      !profile.isDemo ||
      profile.bookable !== false ||
      profile.id !== 'demo-ktv-' + String(index + 1).padStart(2, '0') ||
      !Array.isArray(profile.demoServices) ||
      profile.demoServices.length < 2,
  )
) {
  throw new Error('Ten nonbookable demonstration profiles are required.');
}

const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Missing backend DATABASE_MIGRATION_URL.');
const certificate = path.join(backend, 'deploy', 'certificates', 'supabase-ca.crt');
const client = new Client({
  connectionString: url,
  ssl: {
    ca: fs.readFileSync(certificate, 'utf8'),
    rejectUnauthorized: true,
  },
  connectionTimeoutMillis: 10000,
});

async function run() {
  await client.connect();
  const counters = await client.query(
    `SELECT
       (SELECT count(*)::int FROM app_metadata) AS metadata,
       (SELECT count(*)::int FROM provider_applications) AS actual_providers,
       (SELECT count(*)::int FROM services) AS actual_services`,
  );
  console.log('PREFLIGHT', JSON.stringify(counters.rows[0]));
  if (!process.argv.includes('--apply')) {
    console.log('DRY_RUN profiles=10 key=mocmaria.demo.ktv.v1');
    return;
  }
  const payload = {
    type: 'MOC_MARIA_DEMO_KTV',
    purpose: 'visual-preview-only',
    notForBooking: true,
    profiles,
  };
  await client.query(
    `INSERT INTO app_metadata (key,value)
       VALUES ($1,$2::jsonb)
     ON CONFLICT (key) DO UPDATE
       SET value=EXCLUDED.value,updated_at=now()`,
    ['mocmaria.demo.ktv.v1', JSON.stringify(payload)],
  );
  const result = await client.query(
    `SELECT jsonb_array_length(value->'profiles') AS n,
      value->>'notForBooking' AS disabled
     FROM app_metadata WHERE key=$1`,
    ['mocmaria.demo.ktv.v1'],
  );
  if (Number(result.rows[0]?.n) !== 10 || result.rows[0]?.disabled !== 'true') {
    throw new Error('Seed verification failed.');
  }
  console.log('SEEDED_DEMO_PROFILES=10; REAL_PROVIDER_DATA_UNCHANGED');
}

run()
  .catch((error) => {
    console.error('DEMO_SEED_FAILED', error.code || error.name || 'unknown');
    process.exitCode = 1;
  })
  .finally(async () => client.end().catch(() => {}));
