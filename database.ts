import { Database } from "@db/sqlite";

export interface Deuda {
  id: number;
  empresaAcreedora: string;
  numeroFactura: string;
  fechaEmision: string;
  fechaVencimiento: string;
  montoPendiente: number;
  estado: "VIGENTE" | "VENCIDO";
  diasRetraso: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  rut: string;
  banco: string;
  cuenta: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeudaData {
  empresaAcreedora: string;
  numeroFactura: string;
  fechaEmision: string;
  fechaVencimiento: string;
  montoPendiente: number;
  estado: "VIGENTE" | "VENCIDO";
  diasRetraso: number;
}

export interface UpdateDeudaData {
  empresaAcreedora?: string;
  numeroFactura?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  montoPendiente?: number;
  estado?: "VIGENTE" | "VENCIDO";
  diasRetraso?: number;
}

class DatabaseManager {
  private db: Database;

  constructor(dbPath: string = "intranet.db") {
    this.db = new Database(dbPath);
  }

  // Métodos para Deudas
  getAllDeudas(): Deuda[] {
    const rows = this.db.prepare(`
      SELECT 
        id,
        empresa_acreedora as empresaAcreedora,
        numero_factura as numeroFactura,
        fecha_emision as fechaEmision,
        fecha_vencimiento as fechaVencimiento,
        monto_pendiente as montoPendiente,
        estado,
        dias_retraso as diasRetraso,
        created_at as createdAt,
        updated_at as updatedAt
      FROM deudas 
      ORDER BY fecha_vencimiento ASC
    `).all() as Deuda[];
    
    return rows;
  }

  getDeudaById(id: number): Deuda | null {
    const row = this.db.prepare(`
      SELECT 
        id,
        empresa_acreedora as empresaAcreedora,
        numero_factura as numeroFactura,
        fecha_emision as fechaEmision,
        fecha_vencimiento as fechaVencimiento,
        monto_pendiente as montoPendiente,
        estado,
        dias_retraso as diasRetraso,
        created_at as createdAt,
        updated_at as updatedAt
      FROM deudas 
      WHERE id = ?
    `).get(id) as Deuda | undefined;
    
    return row || null;
  }

  createDeuda(data: CreateDeudaData): Deuda {
    const stmt = this.db.prepare(`
      INSERT INTO deudas (
        empresa_acreedora, numero_factura, fecha_emision, 
        fecha_vencimiento, monto_pendiente, estado, dias_retraso
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.empresaAcreedora,
      data.numeroFactura,
      data.fechaEmision,
      data.fechaVencimiento,
      data.montoPendiente,
      data.estado,
      data.diasRetraso
    );
    
    const newDeuda = this.getDeudaById(result.lastInsertRowId as number);
    if (!newDeuda) {
      throw new Error("Error al crear la deuda");
    }
    
    return newDeuda;
  }

  updateDeuda(id: number, data: UpdateDeudaData): Deuda | null {
    const existingDeuda = this.getDeudaById(id);
    if (!existingDeuda) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.empresaAcreedora !== undefined) {
      updates.push("empresa_acreedora = ?");
      values.push(data.empresaAcreedora);
    }
    if (data.numeroFactura !== undefined) {
      updates.push("numero_factura = ?");
      values.push(data.numeroFactura);
    }
    if (data.fechaEmision !== undefined) {
      updates.push("fecha_emision = ?");
      values.push(data.fechaEmision);
    }
    if (data.fechaVencimiento !== undefined) {
      updates.push("fecha_vencimiento = ?");
      values.push(data.fechaVencimiento);
    }
    if (data.montoPendiente !== undefined) {
      updates.push("monto_pendiente = ?");
      values.push(data.montoPendiente);
    }
    if (data.estado !== undefined) {
      updates.push("estado = ?");
      values.push(data.estado);
    }
    if (data.diasRetraso !== undefined) {
      updates.push("dias_retraso = ?");
      values.push(data.diasRetraso);
    }

    if (updates.length === 0) {
      return existingDeuda;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE deudas 
      SET ${updates.join(", ")}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return this.getDeudaById(id);
  }

  deleteDeuda(id: number): Deuda | null {
    const deuda = this.getDeudaById(id);
    if (!deuda) {
      return null;
    }

    const stmt = this.db.prepare("DELETE FROM deudas WHERE id = ?");
    stmt.run(id);
    
    return deuda;
  }

  // Métodos para Empresas
  getAllEmpresas(): Empresa[] {
    const rows = this.db.prepare(`
      SELECT 
        id, nombre, rut, banco, cuenta, email,
        created_at as createdAt,
        updated_at as updatedAt
      FROM empresas 
      ORDER BY nombre ASC
    `).all() as Empresa[];
    
    return rows;
  }

  // Método para obtener resumen
  getResumen() {
    const totalAdeudado = this.db.prepare(`
      SELECT COALESCE(SUM(monto_pendiente), 0) as total 
      FROM deudas
    `).get() as { total: number };

    const desglosePorEmpresa = this.db.prepare(`
      SELECT 
        empresa_acreedora as empresa,
        SUM(monto_pendiente) as total,
        COUNT(*) as facturas
      FROM deudas 
      GROUP BY empresa_acreedora
    `).all() as Array<{ empresa: string; total: number; facturas: number }>;

    const desglose: Record<string, { total: number; facturas: number }> = {};
    for (const item of desglosePorEmpresa) {
      desglose[item.empresa] = {
        total: item.total,
        facturas: item.facturas
      };
    }

    return {
      totalAdeudado: totalAdeudado.total,
      desglosePorEmpresa: desglose
    };
  }

  close() {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: DatabaseManager | null = null;

export function getDatabase(): DatabaseManager {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
