import { NextRequest, NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'
import { promisify } from 'util'

// Configuración de la base de datos
const DB_PATH = './post-its.db'

// Función para inicializar la base de datos
async function initDatabase() {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err)
      } else {
        // Crear tabla si no existe
        db.run(`
          CREATE TABLE IF NOT EXISTS post_its (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT '#fef3c7',
            position INTEGER NOT NULL DEFAULT 0,
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

// GET: Obtener todos los post-its
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived') || '0'

    const db = await initDatabase()

    return new Promise<NextResponse>((resolve, reject) => {
      db.all(
        'SELECT * FROM post_its WHERE archived = ? ORDER BY position ASC, created_at DESC',
        [archived],
        (err, rows) => {
          if (err) {
            console.error('Error fetching post-its:', err)
            reject(err)
          } else {
            resolve(NextResponse.json({ postIts: rows }))
          }
          db.close()
        }
      )
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error', postIts: [] },
      { status: 500 }
    )
  }
}

// POST: Crear nuevo post-it
export async function POST(request: NextRequest) {
  try {
    const { title, content, color, position } = await request.json()
    
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const db = await initDatabase()
    const id = `postit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return new Promise<NextResponse>((resolve, reject) => {
      // Primero, incrementar la posición de todos los post-its existentes
      db.run(
        'UPDATE post_its SET position = position + 1',
        function(err) {
          if (err) {
            console.error('Error updating positions:', err)
            reject(err)
            return
          }

          // Luego, insertar el nuevo post-it en la posición 0
          db.run(
            `INSERT INTO post_its (id, title, content, color, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [id, title, content || '', color || '#fef3c7'],
            function(err) {
              if (err) {
                console.error('Error creating post-it:', err)
                reject(err)
              } else {
                // Obtener el post-it recién creado
                db.get(
                  'SELECT * FROM post_its WHERE id = ?',
                  [id],
                  (err, row) => {
                    if (err) {
                      reject(err)
                    } else {
                      resolve(NextResponse.json({ postIt: row }))
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
