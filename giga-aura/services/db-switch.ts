/**
 * Database Backend Switcher
 * This utility module allows for seamless switching between database backends.
 * Currently supports PostgreSQL, Cloudflare KV, and legacy Firebase.
 * PostgreSQL is the primary database backend going forward.
 */

import postgresqlDb from './postgresql-db';
import cloudflareKvDb from './cloudflare-kv';
import legacyFirebaseDb from './db';  // Legacy Firebase implementation

// Database backend options
export enum DatabaseBackend {
  POSTGRESQL = 'postgresql',
  CLOUDFLARE_KV = 'cloudflare-kv',
  FIREBASE = 'firebase'
}

// Default to PostgreSQL
let currentBackend: DatabaseBackend = DatabaseBackend.POSTGRESQL;

/**
 * Set the database backend to use
 */
export const setDatabaseBackend = (backend: DatabaseBackend): void => {
  console.log(`Switching database backend to ${backend}`);
  currentBackend = backend;
};

/**
 * Get the current database backend
 */
export const getCurrentBackend = (): DatabaseBackend => {
  return currentBackend;
};

/**
 * Get the database implementation based on the current backend setting
 */
export const getDatabase = () => {
  switch (currentBackend) {
    case DatabaseBackend.POSTGRESQL:
      return postgresqlDb;
    case DatabaseBackend.CLOUDFLARE_KV:
      return cloudflareKvDb;
    case DatabaseBackend.FIREBASE:
      console.warn('Using deprecated Firebase backend - this will be removed in a future update');
      return legacyFirebaseDb;
    default:
      console.log('No database backend specified, defaulting to PostgreSQL');
      return postgresqlDb;
  }
};

// Export a convenience instance for direct imports
export default getDatabase(); 