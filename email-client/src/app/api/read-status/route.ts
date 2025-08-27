import { NextRequest, NextResponse } from 'next/server'
import { Database } from 'sqlite3'
import { promisify } from 'util'
import path from 'path'

// Crear la base de datos SQLite
const dbPath = path.join(process.cwd(), 'data', 'email-status.db')

// Función para inicializar la base de datos
async function initDatabase() {
  return new Promise<Database>((resolve, reject) => {
    const db = new Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err)
        reject(err)
      } else {
        // Crear la tabla si no existe
        db.run(`
          CREATE TABLE IF NOT EXISTS read_emails (
            email_id TEXT PRIMARY KEY,
            read_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating table:', err)
            reject(err)
          } else {
            resolve(db)
          }
        })
      }
    })
  })
}

// GET: Obtener correos leídos
export async function GET() {
  try {
    const db = await initDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.all('SELECT email_id FROM read_emails', (err, rows) => {
        if (err) {
          console.error('Error fetching read emails:', err)
          reject(err)
        } else {
          const readEmailIds = rows.map((row: any) => row.email_id)
          resolve(NextResponse.json({ readEmails: readEmailIds }))
        }
        db.close()
      })
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error', readEmails: [] },
      { status: 500 }
    )
  }
}

// POST: Marcar correo como leído
export async function POST(request: NextRequest) {
  try {
    const { emailId } = await request.json()
    
    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      )
    }

    const db = await initDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO read_emails (email_id) VALUES (?)',
        [emailId],
        function(err) {
          if (err) {
            console.error('Error marking email as read:', err)
            reject(err)
          } else {
            resolve(NextResponse.json({ success: true }))
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

// DELETE: Marcar correo como no leído
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    
    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      )
    }

    const db = await initDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        'DELETE FROM read_emails WHERE email_id = ?',
        [emailId],
        function(err) {
          if (err) {
            console.error('Error marking email as unread:', err)
            reject(err)
          } else {
            resolve(NextResponse.json({ success: true }))
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
