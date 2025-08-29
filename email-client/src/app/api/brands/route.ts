import { NextRequest, NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'

// Configuración de la base de datos
const CONTACTS_DB_PATH = './contacts.db'

// Función para conectar a la base de datos
async function getDatabase() {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(CONTACTS_DB_PATH, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(db)
      }
    })
  })
}

// GET: Obtener todas las marcas o marcas de una empresa específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const companyId = searchParams.get('companyId')
    
    const db = await getDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      let query = `
        SELECT b.*, c.name as company_name 
        FROM brands b 
        LEFT JOIN companies c ON b.company_id = c.id 
        ORDER BY b.name ASC
      `
      let params: any[] = []
      
      if (companyId) {
        query = `
          SELECT b.*, c.name as company_name 
          FROM brands b 
          LEFT JOIN companies c ON b.company_id = c.id 
          WHERE b.company_id = ?
          ORDER BY b.name ASC
        `
        params = [companyId]
      } else if (search) {
        query = `
          SELECT b.*, c.name as company_name 
          FROM brands b 
          LEFT JOIN companies c ON b.company_id = c.id 
          WHERE b.name LIKE ? OR b.description LIKE ? OR c.name LIKE ?
          ORDER BY b.name ASC
        `
        const searchTerm = `%${search}%`
        params = [searchTerm, searchTerm, searchTerm]
      }
      
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Error fetching brands:', err)
          reject(err)
        } else {
          resolve(NextResponse.json({ brands: rows || [] }))
        }
        db.close()
      })
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error', brands: [] },
      { status: 500 }
    )
  }
}

// POST: Crear nueva marca
export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      company_id, 
      description, 
      status, 
      registration_date, 
      registration_number, 
      class_nice, 
      notes 
    } = await request.json()
    
    if (!name || !company_id) {
      return NextResponse.json(
        { error: 'Brand name and company ID are required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const id = `brand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return new Promise<NextResponse>((resolve, reject) => {
      // Verificar que la empresa existe
      db.get(
        'SELECT id FROM companies WHERE id = ?',
        [company_id],
        (err, company) => {
          if (err) {
            reject(err)
            return
          }
          
          if (!company) {
            resolve(NextResponse.json(
              { error: 'Company not found' },
              { status: 404 }
            ))
            db.close()
            return
          }

          // Crear la marca
          db.run(
            `INSERT INTO brands (id, name, company_id, description, status, registration_date, registration_number, class_nice, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              id, 
              name, 
              company_id, 
              description || null, 
              status || 'active', 
              registration_date || null, 
              registration_number || null, 
              class_nice || null, 
              notes || null
            ],
            function(err) {
              if (err) {
                console.error('Error creating brand:', err)
                reject(err)
              } else {
                // Obtener la marca recién creada con información de la empresa
                db.get(
                  `SELECT b.*, c.name as company_name 
                   FROM brands b 
                   LEFT JOIN companies c ON b.company_id = c.id 
                   WHERE b.id = ?`,
                  [id],
                  (err, row) => {
                    if (err) {
                      reject(err)
                    } else {
                      resolve(NextResponse.json({ brand: row }))
                    }
                    db.close()
                  }
                )
              }
            }
          )
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
