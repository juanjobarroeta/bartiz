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
    
    console.log('✅ Database initialized successfully!')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    throw error
  }
}

export default initDatabase
