/**
 * Database Backend Switcher
 * This utility module allows for seamless switching between database backends.
 * PostgreSQL is the primary and only supported database backend going forward.
 */

import postgresqlDb from './postgresql-db';

// Database backend options
export enum DatabaseBackend {
  POSTGRESQL = 'postgresql',
  LOCAL_STORAGE = 'local_storage'
}

// Default to PostgreSQL
let currentBackend: DatabaseBackend = DatabaseBackend.POSTGRESQL;

/**
 * Set the database backend to use
 */
export const setDatabaseBackend = (backend: DatabaseBackend): void => {
  if (backend === DatabaseBackend.LOCAL_STORAGE) {
    console.log(`Setting database backend to local storage (client-side fallback)`);
    currentBackend = DatabaseBackend.LOCAL_STORAGE;
  } else {
    // Always default to PostgreSQL for any other value
    console.log(`Setting database backend to PostgreSQL`);
    currentBackend = DatabaseBackend.POSTGRESQL;
  }
};

/**
 * Get the current database backend
 */
export const getCurrentBackend = (): DatabaseBackend => {
  return currentBackend;
};

/**
 * Get the database implementation
 */
export const getDatabase = () => {
  return postgresqlDb;
};

// Export a convenience instance for direct imports
export default getDatabase(); 