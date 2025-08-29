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

// GET: Obtener todas las empresas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const includeBrands = searchParams.get('includeBrands') === 'true'
    
    const db = await getDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      let query = 'SELECT * FROM companies ORDER BY name ASC'
      let params: any[] = []
      
      if (search) {
        query = `
          SELECT * FROM companies 
          WHERE name LIKE ? OR description LIKE ?
          ORDER BY name ASC
        `
        const searchTerm = `%${search}%`
        params = [searchTerm, searchTerm]
      }
      
      db.all(query, params, (err, companies) => {
        if (err) {
          console.error('Error fetching companies:', err)
          reject(err)
          return
        }

        if (!includeBrands) {
          resolve(NextResponse.json({ companies: companies || [] }))
          db.close()
          return
        }

        // Si se solicitan las marcas, obtenerlas para cada empresa
        const companiesWithBrands = companies || []
        let completed = 0

        if (companiesWithBrands.length === 0) {
          resolve(NextResponse.json({ companies: [] }))
          db.close()
          return
        }

        companiesWithBrands.forEach((company: any, index: number) => {
          db.all(
            'SELECT * FROM brands WHERE company_id = ? ORDER BY name ASC',
            [company.id],
            (err, brands) => {
              if (!err) {
                companiesWithBrands[index].brands = brands || []
              }
              completed++
              
              if (completed === companiesWithBrands.length) {
                resolve(NextResponse.json({ companies: companiesWithBrands }))
                db.close()
              }
            }
          )
        })
      })
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error', companies: [] },
      { status: 500 }
    )
  }
}

// POST: Crear nueva empresa
export async function POST(request: NextRequest) {
  try {
    const { name, description, website, phone, address } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const id = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        `INSERT INTO companies (id, name, description, website, phone, address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [id, name, description || null, website || null, phone || null, address || null],
        function(err) {
          if (err) {
            console.error('Error creating company:', err)
            if (err.message.includes('UNIQUE constraint failed')) {
              resolve(NextResponse.json(
                { error: 'Company name already exists' },
                { status: 409 }
              ))
            } else {
              reject(err)
            }
          } else {
            // Obtener la empresa recién creada
            db.get(
              'SELECT * FROM companies WHERE id = ?',
              [id],
              (err, row) => {
                if (err) {
                  reject(err)
                } else {
                  resolve(NextResponse.json({ company: row }))
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
