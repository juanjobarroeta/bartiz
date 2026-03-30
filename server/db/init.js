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
      const migration1 = readFileSync(join(__dirname, 'migrations/001_increase_articulo_nombre.sql'), 'utf8')
      await pool.query(migration1)
      console.log('✅ Migration 1: articulo_nombre increased to TEXT')
    } catch (e) {
      console.log('ℹ️  Migration 1 already applied')
    }
    
    try {
      const migration2 = readFileSync(join(__dirname, 'migrations/002_add_dual_pricing.sql'), 'utf8')
      await pool.query(migration2)
      console.log('✅ Migration 2: Added dual pricing columns')
    } catch (e) {
      console.log('ℹ️  Migration 2 already applied')
    }
    
    console.log('✅ Database initialized successfully!')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    throw error
  }
}

export default initDatabase
