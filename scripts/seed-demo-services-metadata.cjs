#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Demo previews only: never insert real services, pricing, eligibility or bookings.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '..', 'moc_maria_be');
const backendRequire = createRequire(path.join(backend, 'package.json'));
const { Client } = backendRequire('pg');
backendRequire('dotenv').config({ path: path.join(backend, '.env'), quiet: true });

const services = JSON.parse(
  fs.readFileSync(path.join(frontend, 'src', 'features', 'mobile', 'demo-services.json'), 'utf8'),
);
const providers = JSON.parse(
  fs.readFileSync(path.join(frontend, 'src', 'features', 'mobile', 'demo-ktvs.json'), 'utf8'),
);
if (
  !Array.isArray(services) ||
  services.length !== 10 ||
  new Set(services.map((item) => item.service.id)).size !== 10 ||
  services.some(
    (item) =>
      !item.isDemo ||
      item.service.isPublished !== false ||
      !item.service.id.startsWith('demo-') ||
      !item.service.slug.endsWith('-demo') ||
      !item.imageUrl.startsWith('/demo/services/') &&
        !item.imageUrl.startsWith('https://giangxa-media-cdn.b-cdn.net/moc-maria/demo-services/') ||
      !Array.isArray(item.variants) ||
      item.variants.length < 2 ||
      !Array.isArray(item.demoProviderIds) ||
      item.demoProviderIds.length < 1 ||
      item.demoProviderIds.some((id) =>
        !providers.some(
          (provider) =>
            provider.id === id &&
            provider.isDemo &&
            provider.bookable === false &&
            provider.demoServices.some((offer) => offer.id === item.service.id),
        ),
      ),
  )
) {
  throw new Error('Invalid demo catalog: ten linked nonbookable services required.');
}

const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Missing backend DATABASE_MIGRATION_URL.');
const client = new Client({
  connectionString: url,
  ssl: {
    ca: fs.readFileSync(path.join(backend, 'deploy', 'certificates', 'supabase-ca.crt'), 'utf8'),
    rejectUnauthorized: true,
  },
  connectionTimeoutMillis: 10000,
});

async function run() {
  await client.connect();
  const counts = await client.query(
    `SELECT
      (SELECT count(*)::int FROM services) AS real_services,
      (SELECT count(*)::int FROM provider_applications) AS real_providers,
      (SELECT count(*)::int FROM app_metadata) AS metadata`,
  );
  console.log('PREFLIGHT', JSON.stringify(counts.rows[0]));
  if (!process.argv.includes('--apply')) {
    console.log('DRY_RUN demo_services=' + services.length);
    return;
  }
  const payload = {
    type: 'MOC_MARIA_DEMO_MASSAGE_SERVICES',
    purpose: 'visual-preview-only',
    notForBooking: true,
    services,
  };
  await client.query(
    `INSERT INTO app_metadata(key,value) VALUES ($1,$2::jsonb)
      ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
    ['mocmaria.demo.services.v1', JSON.stringify(payload)],
  );
  const verified = await client.query(
    `SELECT jsonb_array_length(value->'services') AS n,
       value->>'notForBooking' AS disabled
     FROM app_metadata WHERE key=$1`,
    ['mocmaria.demo.services.v1'],
  );
  if (Number(verified.rows[0]?.n) !== 10 || verified.rows[0]?.disabled !== 'true') {
    throw new Error('Demo massage seed verification failed.');
  }
  console.log('SEEDED_DEMO_MASSAGE_SERVICES=10; REAL_SERVICE_DATA_UNCHANGED');
}
run()
  .catch((error) => {
    console.error('DEMO_MASSAGE_SEED_FAILED', error.code || error.name || 'unknown');
    process.exitCode = 1;
  })
  .finally(async () => client.end().catch(() => {}));
