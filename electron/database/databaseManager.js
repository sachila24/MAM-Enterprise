import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { DB_FILENAME, SCHEMA_SQL } from './schema.js';

/** @type {import('better-sqlite3').Database | null} */
let db = null;

const COLLECTION_KEYS = [
  'loan_installments',
  'loan_interest_cycles',
  'payment_allocations',
  'early_settlements',
  'guarantees',
  'receipts',
  'expenses',
  'cash_transactions',
];

export function getDatabasePath() {
  return path.join(app.getPath('userData'), DB_FILENAME);
}

function assertDb() {
  if (!db) {
    throw new Error('SQLite database is not initialized.');
  }
  return db;
}

/** Create database file and tables if missing. Safe to call on every startup. */
export function initializeDatabase() {
  if (db) {
    return { path: getDatabasePath(), created: false };
  }

  const dbPath = getDatabasePath();
  const existed = fs.existsSync(dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);

  return { path: dbPath, created: !existed };
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/** Sync key-value access for future StorageAdapter (Phase 2). */
export function kvGet(key) {
  const database = assertDb();
  const row = database
    .prepare('SELECT value FROM kv_store WHERE key = ?')
    .get(key);
  return row?.value ?? null;
}

export function kvSet(key, value) {
  const database = assertDb();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO kv_store (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, value, now);
}

export function kvRemove(key) {
  const database = assertDb();
  database.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
}

function getMeta(key) {
  const database = assertDb();
  const row = database
    .prepare('SELECT value FROM migration_meta WHERE key = ?')
    .get(key);
  return row?.value ?? null;
}

function setMeta(key, value) {
  const database = assertDb();
  database
    .prepare(
      `INSERT INTO migration_meta (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

function countTable(tableName) {
  const database = assertDb();
  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get();
  return row?.count ?? 0;
}

export function getEntityCounts() {
  return {
    profiles: countTable('profiles'),
    customers: countTable('customers'),
    bikes: countTable('bikes'),
    loans: countTable('loans'),
    payments: countTable('payments'),
    documents: countTable('documents'),
    audit_logs: countTable('audit_logs'),
  };
}

function countCollectionItems(collectionName) {
  const database = assertDb();
  const row = database
    .prepare('SELECT data_json FROM db_collections WHERE collection_name = ?')
    .get(collectionName);
  if (!row?.data_json) {
    return 0;
  }
  try {
    const parsed = JSON.parse(row.data_json);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function countSettingExists(key) {
  const database = assertDb();
  const row = database
    .prepare('SELECT data_json FROM settings WHERE key = ?')
    .get(key);
  return row?.data_json ? 1 : 0;
}

function countCounterKeys() {
  const database = assertDb();
  const row = database
    .prepare(`SELECT data_json FROM settings WHERE key = 'counters'`)
    .get();
  if (!row?.data_json) {
    return 0;
  }
  try {
    const parsed = JSON.parse(row.data_json);
    if (typeof parsed !== 'object' || parsed === null) {
      return 0;
    }
    return Object.keys(parsed).length;
  } catch {
    return 0;
  }
}

/** Full mirror counts for all MamDemoDb collections. */
export function getFullSqliteCounts() {
  return {
    profiles: countTable('profiles'),
    customers: countTable('customers'),
    bikes: countTable('bikes'),
    loans: countTable('loans'),
    loan_installments: countCollectionItems('loan_installments'),
    loan_interest_cycles: countCollectionItems('loan_interest_cycles'),
    loan_payments: countTable('payments'),
    payment_allocations: countCollectionItems('payment_allocations'),
    documents: countTable('documents'),
    receipts: countCollectionItems('receipts'),
    early_settlements: countCollectionItems('early_settlements'),
    guarantees: countCollectionItems('guarantees'),
    audit_logs: countTable('audit_logs'),
    cash_transactions: countCollectionItems('cash_transactions'),
    expenses: countCollectionItems('expenses'),
    business_settings: countSettingExists('business_settings'),
    app_auth: countSettingExists('app_auth'),
    counters: countCounterKeys(),
  };
}

const FULL_COLLECTION_KEYS = [
  'profiles',
  'customers',
  'bikes',
  'loans',
  'loan_installments',
  'loan_interest_cycles',
  'loan_payments',
  'payment_allocations',
  'documents',
  'receipts',
  'early_settlements',
  'guarantees',
  'audit_logs',
  'cash_transactions',
  'expenses',
  'business_settings',
  'app_auth',
  'counters',
];

function compareFullCounts(sourceCounts, sqliteCounts) {
  const rows = [];
  const mismatches = [];
  for (const key of FULL_COLLECTION_KEYS) {
    const local = sourceCounts[key] ?? 0;
    const sqlite = sqliteCounts[key] ?? 0;
    const match = local === sqlite;
    rows.push({ collection: key, local, sqlite, match });
    if (!match) {
      mismatches.push({
        entity: key,
        source: local,
        sqlite,
        delta: sqlite - local,
      });
    }
  }
  return { rows, mismatches };
}

export function getDatabaseFileStats() {
  const dbPath = getDatabasePath();
  try {
    if (!fs.existsSync(dbPath)) {
      return {
        path: dbPath,
        sizeBytes: 0,
        sizeMb: 0,
        exists: false,
      };
    }
    const stat = fs.statSync(dbPath);
    const sizeBytes = stat.size;
    return {
      path: dbPath,
      sizeBytes,
      sizeMb: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
      exists: true,
    };
  } catch (err) {
    return {
      path: dbPath,
      sizeBytes: 0,
      sizeMb: 0,
      exists: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Compare all MamDemoDb collection counts between source and SQLite. */
export function verifyFullMigration(sourceCounts) {
  const sqliteCounts = getFullSqliteCounts();
  const { rows, mismatches } = compareFullCounts(sourceCounts, sqliteCounts);

  return {
    ok: mismatches.length === 0,
    rows,
    sourceCounts,
    sqliteCounts,
    mismatches,
    databasePath: getDatabasePath(),
    migrationCompleted: getMeta('migration_completed') === 'true',
    migrationCompletedAt: getMeta('migration_completed_at'),
    lastSyncAt: getMeta('last_sync_at'),
  };
}

function isValidMamDb(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.version === 1 &&
    Array.isArray(value.customers)
  );
}

function importRecords(database, dbData) {
  const insertProfile = database.prepare(
    `INSERT OR REPLACE INTO profiles (id, data_json, created_at)
     VALUES (?, ?, ?)`
  );
  const insertCustomer = database.prepare(
    `INSERT OR REPLACE INTO customers (id, customer_code, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertBike = database.prepare(
    `INSERT OR REPLACE INTO bikes (id, bike_code, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertLoan = database.prepare(
    `INSERT OR REPLACE INTO loans (id, loan_code, customer_id, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertPayment = database.prepare(
    `INSERT OR REPLACE INTO payments (id, payment_code, loan_id, customer_id, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertDocument = database.prepare(
    `INSERT OR REPLACE INTO documents (id, document_number, document_type, loan_id, payment_id, data_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertAuditLog = database.prepare(
    `INSERT OR REPLACE INTO audit_logs (id, entity_type, entity_id, data_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertSetting = database.prepare(
    `INSERT OR REPLACE INTO settings (key, data_json, updated_at)
     VALUES (?, ?, ?)`
  );
  const insertCollection = database.prepare(
    `INSERT OR REPLACE INTO db_collections (collection_name, data_json, updated_at)
     VALUES (?, ?, ?)`
  );

  for (const profile of dbData.profiles ?? []) {
    insertProfile.run(profile.id, JSON.stringify(profile), profile.created_at);
  }

  for (const customer of dbData.customers ?? []) {
    insertCustomer.run(
      customer.id,
      customer.customer_code,
      JSON.stringify(customer),
      customer.created_at,
      customer.updated_at
    );
  }

  for (const bike of dbData.bikes ?? []) {
    insertBike.run(
      bike.id,
      bike.bike_code,
      JSON.stringify(bike),
      bike.created_at,
      bike.updated_at
    );
  }

  for (const loan of dbData.loans ?? []) {
    insertLoan.run(
      loan.id,
      loan.loan_code,
      loan.customer_id,
      JSON.stringify(loan),
      loan.created_at,
      loan.updated_at
    );
  }

  for (const payment of dbData.loan_payments ?? []) {
    insertPayment.run(
      payment.id,
      payment.payment_code,
      payment.loan_id,
      payment.customer_id,
      JSON.stringify(payment),
      payment.created_at,
      payment.updated_at
    );
  }

  for (const document of dbData.documents ?? []) {
    insertDocument.run(
      document.id,
      document.document_number,
      document.document_type,
      document.loan_id ?? null,
      document.payment_id ?? null,
      JSON.stringify(document),
      document.created_at
    );
  }

  for (const log of dbData.audit_logs ?? []) {
    insertAuditLog.run(
      log.id,
      log.entity_type,
      log.entity_id,
      JSON.stringify(log),
      log.created_at
    );
  }

  const now = new Date().toISOString();
  if (dbData.business_settings) {
    insertSetting.run(
      'business_settings',
      JSON.stringify(dbData.business_settings),
      dbData.business_settings.updated_at ?? now
    );
  }
  if (dbData.app_auth) {
    insertSetting.run(
      'app_auth',
      JSON.stringify(dbData.app_auth),
      dbData.app_auth.updated_at ?? now
    );
  }
  insertSetting.run('counters', JSON.stringify(dbData.counters ?? {}), now);

  for (const collectionName of COLLECTION_KEYS) {
    const items = dbData[collectionName];
    if (Array.isArray(items)) {
      insertCollection.run(collectionName, JSON.stringify(items), now);
    }
  }
}

const ENTITY_TABLES = [
  { table: 'profiles', idField: 'profiles' },
  { table: 'customers', idField: 'customers' },
  { table: 'bikes', idField: 'bikes' },
  { table: 'loans', idField: 'loans' },
  { table: 'payments', idField: 'loan_payments' },
  { table: 'documents', idField: 'documents' },
  { table: 'audit_logs', idField: 'audit_logs' },
];

function purgeOrphans(database, tableName, ids) {
  if (ids.length === 0) {
    database.prepare(`DELETE FROM ${tableName}`).run();
    return;
  }
  const placeholders = ids.map(() => '?').join(',');
  database
    .prepare(`DELETE FROM ${tableName} WHERE id NOT IN (${placeholders})`)
    .run(...ids);
}

function syncRecords(database, dbData) {
  importRecords(database, dbData);
  for (const { table, idField } of ENTITY_TABLES) {
    const rows = dbData[idField] ?? [];
    const ids = rows.map((row) => row.id);
    purgeOrphans(database, table, ids);
  }
}

function buildSourceCounts(dbData) {
  return {
    profiles: dbData.profiles?.length ?? 0,
    customers: dbData.customers?.length ?? 0,
    bikes: dbData.bikes?.length ?? 0,
    loans: dbData.loans?.length ?? 0,
    payments: dbData.loan_payments?.length ?? 0,
    documents: dbData.documents?.length ?? 0,
    audit_logs: dbData.audit_logs?.length ?? 0,
  };
}

function compareCounts(sourceCounts, sqliteCounts) {
  const entities = ['customers', 'bikes', 'loans', 'payments', 'documents'];
  const mismatches = [];
  for (const entity of entities) {
    const source = sourceCounts[entity] ?? 0;
    const sqlite = sqliteCounts[entity] ?? 0;
    if (source !== sqlite) {
      mismatches.push({ entity, source, sqlite, delta: sqlite - source });
    }
  }
  return mismatches;
}

function parseMamDbJson(dbJson) {
  let parsed;
  try {
    parsed = JSON.parse(dbJson);
  } catch {
    throw new Error('Sync payload is not valid JSON.');
  }
  if (!isValidMamDb(parsed)) {
    throw new Error('Sync payload is not a valid MamDemoDb (version 1).');
  }
  return parsed;
}

function needsMigration(sourceCounts) {
  if (getMeta('migration_completed') === 'true') {
    return false;
  }
  const sqliteCounts = getEntityCounts();
  const hasSqliteData =
    sqliteCounts.customers > 0 ||
    sqliteCounts.bikes > 0 ||
    sqliteCounts.loans > 0 ||
    sqliteCounts.payments > 0;
  if (hasSqliteData) {
    return false;
  }
  const hasSourceData =
    (sourceCounts?.customers ?? 0) > 0 ||
    (sourceCounts?.bikes ?? 0) > 0 ||
    (sourceCounts?.loans ?? 0) > 0 ||
    (sourceCounts?.payments ?? 0) > 0 ||
    (sourceCounts?.documents ?? 0) > 0;
  return hasSourceData;
}

/**
 * Full sync from localStorage MamDemoDb JSON into SQLite.
 * Preserves IDs, timestamps, and document references. Removes orphaned rows.
 */
export function syncLocalStorageToSQLite(dbJson) {
  if (!db) {
    initializeDatabase();
  }
  const database = assertDb();
  const parsed = parseMamDbJson(dbJson);
  const sourceCounts = buildSourceCounts(parsed);

  const syncAll = database.transaction((dbData) => {
    syncRecords(database, dbData);
  });

  syncAll(parsed);

  const syncedAt = new Date().toISOString();
  setMeta('last_sync_at', syncedAt);
  const syncCount = Number(getMeta('sync_count') ?? 0) + 1;
  setMeta('sync_count', String(syncCount));

  if (getMeta('migration_completed') !== 'true') {
    setMeta('migration_completed', 'true');
    setMeta('migration_completed_at', syncedAt);
    setMeta('source_version', String(parsed.version));
  }

  const sqliteCounts = getEntityCounts();
  const mismatches = compareCounts(sourceCounts, sqliteCounts);

  return {
    synced: true,
    syncedAt,
    sourceCounts,
    sqliteCounts,
    mismatches,
    ok: mismatches.length === 0,
    databasePath: getDatabasePath(),
  };
}

/**
 * Import localStorage MamDemoDb JSON into SQLite (one-shot migration).
 * Delegates to sync when migration has not yet completed.
 */
export function migrateLocalStorageToSQLite(dbJson) {
  const parsed = parseMamDbJson(dbJson);
  const sourceCounts = buildSourceCounts(parsed);

  if (!needsMigration(sourceCounts)) {
    return {
      migrated: false,
      reason: 'already_migrated_or_sqlite_populated',
      sourceCounts,
      sqliteCounts: getEntityCounts(),
    };
  }

  const result = syncLocalStorageToSQLite(dbJson);
  return {
    migrated: true,
    migratedAt: result.syncedAt,
    sourceCounts: result.sourceCounts,
    sqliteCounts: result.sqliteCounts,
    databasePath: result.databasePath,
  };
}

/** Compare entity counts between source and SQLite. */
export function verifyMigration(sourceCounts) {
  const sqliteCounts = getEntityCounts();
  const mismatches = compareCounts(sourceCounts, sqliteCounts);

  return {
    ok: mismatches.length === 0,
    sourceCounts,
    sqliteCounts,
    mismatches,
    databasePath: getDatabasePath(),
    migrationCompleted: getMeta('migration_completed') === 'true',
    migrationCompletedAt: getMeta('migration_completed_at'),
    lastSyncAt: getMeta('last_sync_at'),
  };
}

/** Health check — database accessible, table counts, migration/sync status. */
export function verifySqliteHealth() {
  try {
    if (!db) {
      initializeDatabase();
    }
    const database = assertDb();
    database.prepare('SELECT 1 AS ok').get();
    const counts = getEntityCounts();
    const migrationCompleted = getMeta('migration_completed') === 'true';

    return {
      ok: true,
      accessible: true,
      counts,
      migrationCompleted,
      migrationCompletedAt: getMeta('migration_completed_at'),
      lastSyncAt: getMeta('last_sync_at'),
      syncCount: Number(getMeta('sync_count') ?? 0),
      databasePath: getDatabasePath(),
    };
  } catch (err) {
    return {
      ok: false,
      accessible: false,
      error: err instanceof Error ? err.message : String(err),
      counts: null,
      migrationCompleted: false,
      migrationCompletedAt: null,
      lastSyncAt: null,
      syncCount: 0,
      databasePath: getDatabasePath(),
    };
  }
}
