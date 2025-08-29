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

// GET: Obtener una marca específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.get(
        `SELECT b.*, c.name as company_name, c.description as company_description
         FROM brands b 
         LEFT JOIN companies c ON b.company_id = c.id 
         WHERE b.id = ?`,
        [id],
        (err, row) => {
          if (err) {
            console.error('Error fetching brand:', err)
            reject(err)
          } else if (!row) {
            resolve(NextResponse.json(
              { error: 'Brand not found' },
              { status: 404 }
            ))
          } else {
            resolve(NextResponse.json({ brand: row }))
          }
          db.close()
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

// PUT: Actualizar marca
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

          // Actualizar la marca
          db.run(
            `UPDATE brands 
             SET name = ?, company_id = ?, description = ?, status = ?, registration_date = ?, 
                 registration_number = ?, class_nice = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              name, 
              company_id, 
              description || null, 
              status || 'active', 
              registration_date || null, 
              registration_number || null, 
              class_nice || null, 
              notes || null, 
              id
            ],
            function(err) {
              if (err) {
                console.error('Error updating brand:', err)
                reject(err)
              } else if (this.changes === 0) {
                resolve(NextResponse.json(
                  { error: 'Brand not found' },
                  { status: 404 }
                ))
              } else {
                // Obtener la marca actualizada con información de la empresa
                db.get(
                  `SELECT b.*, c.name as company_name, c.description as company_description
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

// DELETE: Eliminar marca
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        'DELETE FROM brands WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Error deleting brand:', err)
            reject(err)
          } else if (this.changes === 0) {
            resolve(NextResponse.json(
              { error: 'Brand not found' },
              { status: 404 }
            ))
          } else {
            resolve(NextResponse.json({ 
              message: 'Brand deleted successfully',
              deletedId: id 
            }))
          }
          db.close()
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
