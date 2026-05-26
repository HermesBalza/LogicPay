import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import db from './db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

const filesToMigrate = [
    { file: 'LogicPay Database - Admin_Nomina_Historico.csv', table: 'Admin_Nomina_Historico' },
    { file: 'LogicPay Database - CSG_Nomina.csv', table: 'CSG_Nomina' },
    { file: 'LogicPay Database - CSG_Servicios.csv', table: 'CSG_Servicios' },
    { file: 'LogicPay Database - Nomina_Detalle.csv', table: 'Nomina_Detalle' },
    { file: 'LogicPay Database - Nomina_Historico.csv', table: 'Nomina_Historico' },
    { file: 'LogicPay Database - Personal.csv', table: 'Personal' },
    { file: 'LogicPay Database - Personal_Admin.csv', table: 'Personal_Admin' },
    { file: 'LogicPay Database - Proyectos_Especiales.csv', table: 'Proyectos_Especiales' },
    { file: 'LogicPay Database - Tiendas.csv', table: 'Tiendas' },
    { file: 'LogicPay Database - Variables.csv', table: 'Variables' },
    { file: 'LogicPay Database - WOS.csv', table: 'WOS' },
    { file: 'LogicPay Database - WOS_CSG.csv', table: 'WOS_CSG' }
];

async function migrateFile(fileConfig) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(dataDir, fileConfig.file);
        if (!fs.existsSync(filePath)) {
            console.warn(`[Advertencia] Archivo no encontrado: ${fileConfig.file}, omitiendo...`);
            return resolve();
        }

        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', () => {
                // REGLA: El DELETE debe ejecutarse SIEMPRE que el director lo ordene, incluso cuando el CSV está vacío.
                // Esto garantiza que la base de datos refleje EXACTAMENTE el contenido del CSV:
                //   - Si el CSV tiene datos → se borra lo anterior y se inserta lo nuevo.
                //   - Si el CSV está vacío → se borra lo anterior y la tabla queda vacía.
                // NO mover este DELETE después del chequeo de rows.length === 0.
                db.prepare(`DELETE FROM ${fileConfig.table}`).run();

                if (rows.length === 0) {
                    console.log(`[Info] ${fileConfig.file} está vacío, tabla ${fileConfig.table} limpiada.`);
                    return resolve();
                }

                // Tomamos las claves (columnas) del primer registro
                const keys = Object.keys(rows[0]);
                
                // Mapear los placeholders y los nombres de las columnas escapados
                const placeholders = keys.map(() => '?').join(', ');
                const quotedKeys = keys.map(k => `"${k}"`).join(', ');

                const stmt = db.prepare(`INSERT INTO ${fileConfig.table} (${quotedKeys}) VALUES (${placeholders})`);
                
                const insertMany = db.transaction((items) => {
                    for (const item of items) {
                        const values = keys.map(k => item[k]);
                        stmt.run(values);
                    }
                });

                try {
                    insertMany(rows);
                    console.log(`[Éxito] Migrados ${rows.length} registros a la tabla ${fileConfig.table}`);
                    resolve();
                } catch (e) {
                    console.error(`[Error] Fallo migrando ${fileConfig.table}:`, e);
                    reject(e);
                }
            })
            .on('error', (e) => {
                console.error(`[Error] Fallo leyendo ${fileConfig.file}:`, e);
                reject(e);
            });
    });
}

async function runMigration() {
    console.log('--- Iniciando Migración de Datos (CSV a SQLite) ---');
    for (const config of filesToMigrate) {
        await migrateFile(config);
    }
    console.log('--- Migración completada con éxito ---');
}

runMigration();
