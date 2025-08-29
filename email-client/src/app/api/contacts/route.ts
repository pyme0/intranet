import { NextRequest, NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'

// Configuración de la base de datos
const DB_PATH = './contacts.db'

// Función para inicializar la base de datos
async function initDatabase() {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err)
      } else {
        // Crear tabla si no existe
        db.run(`
          CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            alias TEXT,
            email TEXT NOT NULL,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve(db)
          }
        })
      }
    })
  })
}

// GET: Obtener todos los contactos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    
    const db = await initDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      let query = `
        SELECT c.*, co.name as company_name, co.description as company_description
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.id
        ORDER BY c.name ASC
      `
      let params: any[] = []

      if (search) {
        query = `
          SELECT c.*, co.name as company_name, co.description as company_description
          FROM contacts c
          LEFT JOIN companies co ON c.company_id = co.id
          WHERE c.name LIKE ? OR c.alias LIKE ? OR c.email LIKE ? OR co.name LIKE ?
          ORDER BY c.name ASC
        `
        const searchTerm = `%${search}%`
        params = [searchTerm, searchTerm, searchTerm, searchTerm]
      }
      
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Error fetching contacts:', err)
          reject(err)
        } else {
          resolve(NextResponse.json({ contacts: rows }))
        }
        db.close()
      })
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error', contacts: [] },
      { status: 500 }
    )
  }
}

// POST: Crear nuevo contacto
export async function POST(request: NextRequest) {
  try {
    const { name, alias, email, phone, company_id } = await request.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const db = await initDatabase()
    const id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        `INSERT INTO contacts (id, name, alias, email, phone, company_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [id, name, alias || null, email, phone || null, company_id || null],
        function(err) {
          if (err) {
            console.error('Error creating contact:', err)
            reject(err)
          } else {
            // Obtener el contacto recién creado con información de empresa
            db.get(
              `SELECT c.*, co.name as company_name, co.description as company_description
               FROM contacts c
               LEFT JOIN companies co ON c.company_id = co.id
               WHERE c.id = ?`,
              [id],
              (err, row) => {
                if (err) {
                  reject(err)
                } else {
                  resolve(NextResponse.json({ contact: row }))
                }
                db.close()
              }
            )
          }
        }
      )
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    )
  }
}
