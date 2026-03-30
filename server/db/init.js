import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...')
    
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
    await pool.query(schema)
    
    // Run migrations
    try {
      const migration = readFileSync(join(__dirname, 'migrations/001_increase_articulo_nombre.sql'), 'utf8')
      await pool.query(migration)
      console.log('✅ Migration: articulo_nombre increased to TEXT')
    } catch (migrationError) {
      // Migration might already be applied
      console.log('ℹ️  Migration already applied or not needed')
    }
    
    console.log('✅ Database initialized successfully!')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    throw error
  }
}

export default initDatabase
