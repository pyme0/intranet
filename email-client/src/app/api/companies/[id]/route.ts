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

// GET: Obtener una empresa específica con sus marcas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      // Obtener la empresa
      db.get(
        'SELECT * FROM companies WHERE id = ?',
        [id],
        (err, company) => {
          if (err) {
            console.error('Error fetching company:', err)
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

          // Obtener las marcas de la empresa
          db.all(
            'SELECT * FROM brands WHERE company_id = ? ORDER BY name ASC',
            [id],
            (err, brands) => {
              if (err) {
                console.error('Error fetching brands:', err)
                reject(err)
              } else {
                const companyWithBrands = {
                  ...company,
                  brands: brands || []
                }
                resolve(NextResponse.json({ company: companyWithBrands }))
              }
              db.close()
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

// PUT: Actualizar empresa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, description, website, phone, address } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        `UPDATE companies 
         SET name = ?, description = ?, website = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description || null, website || null, phone || null, address || null, id],
        function(err) {
          if (err) {
            console.error('Error updating company:', err)
            if (err.message.includes('UNIQUE constraint failed')) {
              resolve(NextResponse.json(
                { error: 'Company name already exists' },
                { status: 409 }
              ))
            } else {
              reject(err)
            }
          } else if (this.changes === 0) {
            resolve(NextResponse.json(
              { error: 'Company not found' },
              { status: 404 }
            ))
          } else {
            // Obtener la empresa actualizada con sus marcas
            db.get(
              'SELECT * FROM companies WHERE id = ?',
              [id],
              (err, company) => {
                if (err) {
                  reject(err)
                  return
                }

                // Obtener las marcas
                db.all(
                  'SELECT * FROM brands WHERE company_id = ? ORDER BY name ASC',
                  [id],
                  (err, brands) => {
                    if (err) {
                      reject(err)
                    } else {
                      const companyWithBrands = {
                        ...company,
                        brands: brands || []
                      }
                      resolve(NextResponse.json({ company: companyWithBrands }))
                    }
                    db.close()
                  }
                )
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

// DELETE: Eliminar empresa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      // Verificar si hay contactos asociados
      db.get(
        'SELECT COUNT(*) as count FROM contacts WHERE company_id = ?',
        [id],
        (err, result: any) => {
          if (err) {
            reject(err)
            return
          }

          if (result.count > 0) {
            resolve(NextResponse.json(
              { error: 'Cannot delete company with associated contacts' },
              { status: 409 }
            ))
            db.close()
            return
          }

          // Eliminar la empresa (las marcas se eliminan automáticamente por CASCADE)
          db.run(
            'DELETE FROM companies WHERE id = ?',
            [id],
            function(err) {
              if (err) {
                console.error('Error deleting company:', err)
                reject(err)
              } else if (this.changes === 0) {
                resolve(NextResponse.json(
                  { error: 'Company not found' },
                  { status: 404 }
                ))
              } else {
                resolve(NextResponse.json({ 
                  message: 'Company deleted successfully',
                  deletedId: id 
                }))
              }
              db.close()
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
