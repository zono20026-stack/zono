import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

export const pool = new Pool(
  databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl:
          isProduction ||
          databaseUrl.includes('render.com') ||
          databaseUrl.includes('neon.tech') ||
          databaseUrl.includes('supabase.co') ||
          databaseUrl.includes('supabase.com') ||
          databaseUrl.includes('pooler.supabase.com')
            ? { rejectUnauthorized: false }
            : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5435', 10),
        database: process.env.DB_NAME || 'easy_send_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

// Helper for single parameterized query
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development' && duration > 200) {
    console.warn(`[Slow Query ${duration}ms]: ${text.slice(0, 100)}`);
  }
  return res;
};

// Helper for safe transactional executions
export const executeTransaction = async <T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
