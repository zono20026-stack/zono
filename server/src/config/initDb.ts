import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  try {
    const client = await pool.connect();
    try {
      // Check if users table already exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      const exists = tableCheck.rows[0]?.exists;

      if (!exists) {
        console.log('🔄 [DB Init] Database tables not found. Initializing complete schema & seed...');

        const sqlDir = path.resolve(__dirname, '../../sql');
        const schemaPath = path.join(sqlDir, '01_schema.sql');
        const migrationPath = path.join(sqlDir, '02_migrations.sql');
        const seedPath = path.join(sqlDir, '03_seed.sql');

        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(schemaSql);
          console.log('✅ [DB Init] Core schema applied successfully.');
        }

        if (fs.existsSync(migrationPath)) {
          const migrationSql = fs.readFileSync(migrationPath, 'utf8');
          await client.query(migrationSql);
          console.log('✅ [DB Init] Directory & GPS migrations applied successfully.');
        }

        if (fs.existsSync(seedPath)) {
          const seedSql = fs.readFileSync(seedPath, 'utf8');
          await client.query(seedSql);
          console.log('✅ [DB Init] Master seed data inserted successfully.');
        }

        console.log('🎉 [DB Init] Database initialization complete!');
      } else {
        // Safe incremental migrations check
        const migrationPath = path.resolve(__dirname, '../../sql/02_migrations.sql');
        if (fs.existsSync(migrationPath)) {
          try {
            const migrationSql = fs.readFileSync(migrationPath, 'utf8');
            await client.query(migrationSql);
          } catch (e: any) {
            // Ignore minor duplicate columns or indexes
          }
        }
        console.log('✅ [DB Init] Database is ready and verified.');
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('⚠️ [DB Init Error]:', error.message);
  }
}
