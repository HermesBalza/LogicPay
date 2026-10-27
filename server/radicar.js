// server/radicar.js
// Endpoint de Radicación de Facturas.
// Reglas según radicar_facturas.md:
// - Nomina_Historico: "Fecha Rad." = fecha_fin  (excluye filas semanales WK- de UNITED PARCEL SERVICE AZPEN)
// - Proyectos_Especiales: "Fecha Rad." = segunda fecha del campo Periodo (después de " - ")
// - Solo filas con "Fecha Rad." nula o vacía. Nunca se tocan filas ya radicadas.
import db from './db.js';

const EXCLUIR_AZPEN_WK = `NOT (UPPER(TRIM(nombre)) = 'UNITED PARCEL SERVICE AZPEN' AND codigo LIKE 'WK-%')`;

export function registrarEndpointRadicar(app) {
  app.post('/api/radicar-facturas', async (req, res) => {
    try {
      const nomina = { radicadas: 0 };
      const proyectos = { radicadas: 0, omitidas: [] };

      // --- 1. Nomina_Historico ---
      const updateNomina = db.prepare(
        `UPDATE Nomina_Historico SET "Fecha Rad." = "fecha_fin" WHERE ("Fecha Rad." IS NULL OR "Fecha Rad." = '') AND ${EXCLUIR_AZPEN_WK}`
      );

      // --- 2. Proyectos_Especiales (transacción fila por fila) ---
      const filasPE = db.prepare(
        `SELECT id, Periodo FROM Proyectos_Especiales WHERE "Fecha Rad." IS NULL OR "Fecha Rad." = ''`
      ).all();
      const updatePE = db.prepare(`UPDATE Proyectos_Especiales SET "Fecha Rad." = ? WHERE id = ?`);

      const tx = db.transaction(() => {
        nomina.radicadas = updateNomina.run().changes;
        for (const fila of filasPE) {
          const partes = (fila.Periodo || '').split(' - ');
          if (partes.length === 2 && partes[1].trim()) {
            updatePE.run(partes[1].trim(), fila.id);
            proyectos.radicadas++;
          } else {
            proyectos.omitidas.push({ id: fila.id, periodo: fila.Periodo });
          }
        }
      });
      tx();

      return res.json({ success: true, nomina, proyectos });
    } catch (error) {
      console.error('[LogicPay] Error en radicación de facturas:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });
}
