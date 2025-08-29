import { NextRequest, NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'

// Configuración de la base de datos
const CONTACTS_DB_PATH = './contacts.db'

// Función para conectar a la base de datos de contactos
async function getContactsDatabase() {
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

// GET: Obtener un contacto específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getContactsDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.get(
        `SELECT c.*, co.name as company_name, co.description as company_description
         FROM contacts c
         LEFT JOIN companies co ON c.company_id = co.id
         WHERE c.id = ?`,
        [id],
        (err, row) => {
          if (err) {
            console.error('Error fetching contact:', err)
            reject(err)
          } else if (!row) {
            resolve(NextResponse.json(
              { error: 'Contact not found' },
              { status: 404 }
            ))
          } else {
            resolve(NextResponse.json({ contact: row }))
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

// PUT: Actualizar contacto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name, alias, email, phone, company_id,
      rut, address, represented_company, represented_company_rut, gender,
      power_purpose, brand_class, brand_type, brand_coverage, brand_description,
      brand_registration_number, brand_application_number, brand_logo
    } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const db = await getContactsDatabase()

    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        `UPDATE contacts
         SET name = ?, alias = ?, email = ?, phone = ?, company_id = ?,
             rut = ?, address = ?, represented_company = ?, represented_company_rut = ?, gender = ?,
             power_purpose = ?, brand_class = ?, brand_type = ?, brand_coverage = ?, brand_description = ?,
             brand_registration_number = ?, brand_application_number = ?, brand_logo = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          name, alias || null, email, phone || null, company_id || null,
          rut || null, address || null, represented_company || null, represented_company_rut || null, gender || null,
          power_purpose || null, brand_class || null, brand_type || null, brand_coverage || null, brand_description || null,
          brand_registration_number || null, brand_application_number || null, brand_logo || null,
          id
        ],
        function(err) {
          if (err) {
            console.error('Error updating contact:', err)
            reject(err)
          } else if (this.changes === 0) {
            resolve(NextResponse.json(
              { error: 'Contact not found' },
              { status: 404 }
            ))
          } else {
            // Obtener el contacto actualizado con información de empresa
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

// DELETE: Eliminar contacto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getContactsDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        'DELETE FROM contacts WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Error deleting contact:', err)
            reject(err)
          } else if (this.changes === 0) {
            resolve(NextResponse.json(
              { error: 'Contact not found' },
              { status: 404 }
            ))
          } else {
            resolve(NextResponse.json({ 
              message: 'Contact deleted successfully',
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
