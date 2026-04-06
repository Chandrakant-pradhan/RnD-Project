const SCHEMA_KEY = "pglite_table_schemas";

type SchemaStore = Record<string, Record<string, string>>;

function readStore(): SchemaStore {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: SchemaStore): void {
  try {
    localStorage.setItem(SCHEMA_KEY, JSON.stringify(store));
  } catch {
    console.warn("Failed to persist schema store");
  }
}

export function getTableSchema(db: string | null, table: string): string | null {
  if (!db) return null;
  const store = readStore();
  return store[db]?.[table] ?? null;
}

export function setTableSchema(db: string | null, table: string, ddl: string): void {
  if (!db) return;
  const store = readStore();
  if (!store[db]) store[db] = {};
  store[db][table] = ddl;
  writeStore(store);
}

export function deleteTableSchema(db: string | null, table: string): void {
  if (!db) return;
  const store = readStore();
  if (store[db]) {
    delete store[db][table];
    if (Object.keys(store[db]).length === 0) delete store[db];
    writeStore(store);
  }
}

export function deleteDBSchemas(db: string | null): void {
  if (!db) return;
  const store = readStore();
  delete store[db];
  writeStore(store);
}