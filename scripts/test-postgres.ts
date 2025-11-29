import { Client } from 'pg';

const stagingConfig = {
  host: 'pgbouncer.kyzl60xwk9xrpj9g.flympg.net',
  port: 5432,
  database: 'fly-db',
  user: 'fly-user',
  password: 'bvON2p0LTYUcdYFitOncR370',
  ssl: false,
};

const productionConfig = {
  host: 'pgbouncer.d2gznoqmkl70pkm8.flympg.net',
  port: 5432,
  database: 'fly-db',
  user: 'fly-user',
  password: 'sno9wgaQbaTG5s3dO6pzCkGS',
  ssl: false,
};

async function testConnection(label: string, config: typeof stagingConfig) {
  console.log(`\n=== Testing ${label} ===`);
  const client = new Client(config);

  try {
    await client.connect();
    console.log(`✅ Connected to ${label}`);

    // List all tables
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log(`\nTables in ${label}:`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });

    await client.end();
  } catch (error) {
    console.error(`❌ Failed to connect to ${label}:`, error);
  }
}

async function main() {
  await testConnection('Staging (gs-stream-db-staging)', stagingConfig);
  await testConnection('Production (gs-stream-db)', productionConfig);
}

main().catch(console.error);
