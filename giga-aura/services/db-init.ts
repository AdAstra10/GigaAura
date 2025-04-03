/**
 * Database Initialization for GigaAura
 * This file initializes the database connection and ensures PostgreSQL is used
 */

import { setDatabaseBackend, DatabaseBackend } from './db-switch';
import * as postgresDb from './postgresql-db';

// Initialize database by setting PostgreSQL as the default backend
const initDatabase = (): { db: any, config: { storageType: string, databaseUrl?: string } } => {
  console.log('Initializing database connection...');
  
  // First set up the backend
  try {
    setDatabaseBackend(DatabaseBackend.POSTGRESQL);
    console.log('Database backend set to PostgreSQL');
  } catch (e) {
    console.error('Failed to set database backend to PostgreSQL:', e);
  }
  
  // If running on the server side, use real PostgreSQL
  if (typeof window === 'undefined') {
    try {
      const databaseUrl = process.env.DATABASE_URL || process.env.PG_DATABASE_URL;
      
      if (databaseUrl) {
        console.log('Server-side database initialized with connection string');
        
        return {
          // Return the database instance for convenience
          db: postgresDb,
          
          // Return the list of environment variables being used (without sensitive values)
          config: {
            storageType: 'PostgreSQL (server)',
            databaseUrl: databaseUrl.replace(/\/\/(.+)@/, '//*****@') // Hide credentials
          }
        };
      } else {
        console.log('No database connection string found, using fallback configuration');
        
        return {
          // Return the database instance for convenience (browser version)
          db: postgresDb,
          
          // Return a placeholder config
          config: {
            storageType: 'PostgreSQL (server, fallback config)',
          }
        };
      }
    } catch (e) {
      console.error('Failed to initialize server-side database:', e);
    }
  }
  
  // If we reach here, we're either in the browser or server init failed - use local storage
  console.log('Client-side database initialized with localStorage fallback');
  
  try {
    // Set localStorage-friendly backend
    setDatabaseBackend(DatabaseBackend.LOCAL_STORAGE);
  } catch (e) {
    console.warn('Failed to set database backend to localStorage:', e);
  }
  
  return {
    db: postgresDb,
    config: {
      storageType: 'localStorage',
    }
  };
};

// Initialize the database on module load
const dbInstance = initDatabase();

// Create the enhanced database object
const db = {
  ...dbInstance.db,
  
  // Add a test connection method to verify database connectivity
  testConnection: async () => {
    try {
      // Try to get posts as a connectivity test
      const posts = await postgresDb.getPosts();
      
      if (Array.isArray(posts)) {
        console.log(`Database connection test successful - retrieved ${posts.length} posts`);
        return {
          success: true,
          message: `Database connection successful, found ${posts.length} posts`,
          data: { postCount: posts.length }
        };
      } else {
        console.warn('Database connection test: received non-array response');
        return {
          success: false,
          message: 'Database returned unexpected data format',
          data: null
        };
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown database error',
        data: null
      };
    }
  }
};

// Log when the database module is loaded
console.log('Database module initialized');

// Export the enhanced database instance
export default db; 