import db from './db.js';

console.log('Iniciando diseño de la Base de Datos SQLite...');

const createTablesSQL = `
-- Tabla Variables
CREATE TABLE IF NOT EXISTS Variables (
    "key" TEXT PRIMARY KEY,
    "value" TEXT
);

-- Tabla Personal
CREATE TABLE IF NOT EXISTS Personal (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT,
    "codigo_empleado" TEXT,
    "fecha_ingreso" TEXT,
    "fecha_egreso" TEXT,
    "cargo" TEXT,
    "tienda" TEXT,
    "cuenta_bancaria" TEXT,
    "imagen" TEXT,
    "locationHistory" TEXT,
    "payer_type" TEXT,
    "tin_type" TEXT,
    "tin" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "address_1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "email_tax" TEXT,
    "site_code" TEXT,
    "Rate KBS" TEXT,
    "Rate LGM" TEXT,
    "Observaciones" TEXT,
    "Rate CSG" TEXT,
    "Cliente" TEXT,
    "routing_num" TEXT,
    "account_num" TEXT,
    "account_type" TEXT DEFAULT 'checking',
    "payee_name" TEXT,
    "id_number" TEXT
);

-- Tabla Personal_Admin
CREATE TABLE IF NOT EXISTS Personal_Admin (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "codigo_empleado" TEXT,
    "cargo" TEXT,
    "salario_quincenal" TEXT,
    "frecuencia_pago" TEXT,
    "metodo_pago" TEXT,
    "cuenta_bancaria" TEXT,
    "email" TEXT,
    "fecha_ingreso" TEXT,
    "tin" TEXT,
    "tin_type" TEXT,
    "address_1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "imagen" TEXT,
    "activo" TEXT
);

-- Tabla Tiendas
CREATE TABLE IF NOT EXISTS Tiendas (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT,
    "codigo" TEXT,
    "estado" TEXT,
    "direccion" TEXT,
    "supervisor_kbs" TEXT,
    "supervisor_lsg" TEXT,
    "correo" TEXT,
    "max_horas" TEXT,
    "tarifas_janitorial_kbs" TEXT,
    "tarifas_janitorial_lsg" TEXT,
    "tarifas_utility_kbs" TEXT,
    "tarifas_utility_lsg" TEXT,
    "tarifas_shift_lead_kbs" TEXT,
    "tarifas_shift_lead_lsg" TEXT,
    "employees" TEXT,
    "imagen" TEXT,
    "cliente" TEXT,
    "rate_csg" TEXT,
    "rate_lgm" TEXT,
    "tipo_facturacion" TEXT DEFAULT 'domingo_a_sabado'
);

-- Tabla Nomina_Historico
CREATE TABLE IF NOT EXISTS Nomina_Historico (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT,
    "codigo" TEXT,
    "fecha_inicio" TEXT,
    "fecha_fin" TEXT,
    "data_json" TEXT,
    "Fecha Rad." TEXT,
    "Pago" TEXT,
    "Fecha de Pago" TEXT,
    "WOS" TEXT,
    "Status" TEXT
);

-- Tabla Nomina_Detalle
CREATE TABLE IF NOT EXISTS Nomina_Detalle (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "ID_Consolidacion" TEXT,
    "Tienda" TEXT,
    "Periodo" TEXT,
    "Data_JSON" TEXT,
    "Fecha_Confirmacion" TEXT
);

-- Tabla Admin_Nomina_Historico
CREATE TABLE IF NOT EXISTS Admin_Nomina_Historico (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "Periodo" TEXT,
    "Fecha_Confirmacion" TEXT,
    "Total_Nomina" TEXT,
    "Empleados_JSON" TEXT
);

-- Tabla CSG_Nomina
CREATE TABLE IF NOT EXISTS CSG_Nomina (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "id_nomina" TEXT,
    "periodo" TEXT,
    "total_lgm" TEXT,
    "total_csg" TEXT,
    "fecha_confirmacion" TEXT,
    "correo_enviado" TEXT,
    "servicios_json" TEXT
);

-- Tabla CSG_Servicios
CREATE TABLE IF NOT EXISTS CSG_Servicios (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "correlativo" TEXT,
    "fecha" TEXT,
    "tienda" TEXT,
    "codigo_tienda" TEXT,
    "empleado" TEXT,
    "codigo_empleado" TEXT,
    "num_servicios" TEXT,
    "monto_lgm" TEXT,
    "monto_csg" TEXT,
    "notas" TEXT,
    "estado" TEXT,
    "correo_enviado" TEXT,
    "Fecha Rad." TEXT,
    "Pago" TEXT,
    "Fecha de Pago" TEXT,
    "WOS" TEXT,
    "Status" TEXT,
    "foto_1" TEXT,
    "foto_2" TEXT,
    "foto_3" TEXT,
    "foto_4" TEXT,
    "foto_5" TEXT,
    "foto_6" TEXT,
    "foto_7" TEXT,
    "foto_8" TEXT,
    "foto_9" TEXT,
    "foto_10" TEXT
);

-- Tabla Proyectos_Especiales
CREATE TABLE IF NOT EXISTS Proyectos_Especiales (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "ID_Consolidacion" TEXT,
    "Tienda" TEXT,
    "Periodo" TEXT,
    "Data_JSON" TEXT,
    "Fecha_Confirmacion" TEXT,
    "Correlativo" TEXT,
    "Fecha Rad." TEXT,
    "Pago" TEXT,
    "Fecha de Pago" TEXT,
    "WOS" TEXT,
    "Status" TEXT,
    "Visible" TEXT
);

-- Tabla WOS
CREATE TABLE IF NOT EXISTS WOS (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "WOS_Number" TEXT,
    "Subcontractor" TEXT,
    "Date" TEXT,
    "Data_JSON" TEXT
);

-- Tabla WOS_CSG
CREATE TABLE IF NOT EXISTS WOS_CSG (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "WOS_Number" TEXT,
    "Subcontractor" TEXT,
    "Date" TEXT,
    "Data_JSON" TEXT
);

-- Tabla Gastos_Miscelaneos
CREATE TABLE IF NOT EXISTS Gastos_Miscelaneos (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "concepto" TEXT,
    "monto" TEXT,
    "fecha" TEXT,
    "categoria" TEXT,
    "created_at" TEXT
);

-- Tabla Saldos_Pendientes
CREATE TABLE IF NOT EXISTS Saldos_Pendientes (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "tienda" TEXT NOT NULL,
    "fecha_rad" TEXT,
    "semana_facturada" TEXT,
    "facturacion_kbs" REAL DEFAULT 0,
    "pago_recibido" REAL DEFAULT 0,
    "saldo_pendiente" REAL DEFAULT 0,
    "wos" TEXT,
    "pagado" INTEGER DEFAULT 0,
    "created_at" TEXT DEFAULT (datetime('now','localtime')),
    "updated_at" TEXT DEFAULT (datetime('now','localtime'))
);
`;

try {
    db.exec(createTablesSQL);
    console.log('Tablas SQLite creadas y/o verificadas correctamente.');
} catch (error) {
    console.error('Error al inicializar la base de datos:', error);
}

try {
    db.exec(`ALTER TABLE Tiendas ADD COLUMN "tipo_facturacion" TEXT DEFAULT 'domingo_a_sabado'`);
    console.log('Columna tipo_facturacion agregada a Tiendas.');
} catch (e) {
    // Columna ya existe, ignorar
}
