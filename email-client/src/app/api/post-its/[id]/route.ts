import { NextRequest, NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'

// Configuración de la base de datos
const DB_PATH = './post-its.db'

// Función para inicializar la base de datos
async function initDatabase() {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(db)
      }
    })
  })
}

// PUT: Actualizar post-it
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { title, content, color, position, archived } = await request.json()
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post-it ID is required' },
        { status: 400 }
      )
    }

    const db = await initDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      // Construir la consulta de actualización dinámicamente
      const updates: string[] = []
      const values: any[] = []
      
      if (title !== undefined) {
        updates.push('title = ?')
        values.push(title)
      }
      if (content !== undefined) {
        updates.push('content = ?')
        values.push(content)
      }
      if (color !== undefined) {
        updates.push('color = ?')
        values.push(color)
      }
      if (position !== undefined) {
        updates.push('position = ?')
        values.push(position)
      }
      if (archived !== undefined) {
        updates.push('archived = ?')
        values.push(archived)
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      
      const query = `UPDATE post_its SET ${updates.join(', ')} WHERE id = ?`
      
      db.run(query, values, function(err) {
        if (err) {
          console.error('Error updating post-it:', err)
          reject(err)
        } else if (this.changes === 0) {
          resolve(NextResponse.json(
            { error: 'Post-it not found' },
            { status: 404 }
          ))
        } else {
          // Obtener el post-it actualizado
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
      })
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar post-it
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post-it ID is required' },
        { status: 400 }
      )
    }

    const db = await initDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.run(
        'DELETE FROM post_its WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Error deleting post-it:', err)
            reject(err)
          } else if (this.changes === 0) {
            resolve(NextResponse.json(
              { error: 'Post-it not found' },
              { status: 404 }
            ))
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

// GET: Obtener post-it específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post-it ID is required' },
        { status: 400 }
      )
    }

    const db = await initDatabase()
    
    return new Promise<NextResponse>((resolve, reject) => {
      db.get(
        'SELECT * FROM post_its WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            console.error('Error fetching post-it:', err)
            reject(err)
          } else if (!row) {
            resolve(NextResponse.json(
              { error: 'Post-it not found' },
              { status: 404 }
            ))
          } else {
            resolve(NextResponse.json({ postIt: row }))
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
