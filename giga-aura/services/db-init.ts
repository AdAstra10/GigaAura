/**
 * Database Initialization for GigaAura
 * This file initializes the database connection and ensures PostgreSQL is used
 */

import { setDatabaseBackend, DatabaseBackend } from './db-switch';
import postgresqlDb from './postgresql-db';

// Initialize database by setting PostgreSQL as the default backend
export const initializeDatabase = () => {
  // Check if running in browser or server
  const isServer = typeof window === 'undefined';
  
  if (isServer) {
    console.log('🔌 Initializing PostgreSQL database connection (server-side)');
    
    // Set PostgreSQL as the default database backend (server-side)
    setDatabaseBackend(DatabaseBackend.POSTGRESQL);
    
    return {
      // Return the database instance for convenience
      db: postgresqlDb,
      
      // Return the list of environment variables being used (without sensitive values)
      config: {
        host: process.env.PG_HOST || 'dpg-cvmv93k9c44c73blmoag-a.oregon-postgres.render.com',
        database: process.env.PG_DATABASE || 'gigaaura_storage',
        user: process.env.PG_USER || 'gigaaura_storage_user',
        port: parseInt(process.env.PG_PORT || '5432', 10),
      }
    };
  } else {
    console.log('🔌 Initializing browser-based storage (local storage)');
    
    // In browser, we'll use PostgreSQL implementation which already has localStorage fallbacks
    setDatabaseBackend(DatabaseBackend.POSTGRESQL);
    
    return {
      // Return the database instance for convenience (browser version)
      db: postgresqlDb,
      
      // Return a placeholder config
      config: {
        storageType: 'localStorage',
        status: 'active'
      }
    };
  }
};

// Initialize immediately
export const dbInstance = initializeDatabase();

// Export the database instance for direct use
export default dbInstance.db; 