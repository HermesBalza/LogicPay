# Guia de Radicacion de Facturas — LogicPay

## Descripcion General

La **radicacion de facturas** es el proceso de establecer la **"Fecha Rad."** en las filas de la base de datos que aun no la tienen asignada. Este proceso se realiza **varias veces al dia** mientras los asistentes cargan nuevas facturaciones en el sistema.

La base de datos esta desplegada en **Fly.io** (app: `logicpay`, region: `dfw`) y utiliza **SQLite** almacenada en un volumen montado en `/app/data/database.db`.

---

## Tablas Involucradas

### 1. Tabla: `Nomina_Historico`

| Columna origen | Columna destino | Regla |
|---|---|---|
| `fecha_fin` | `Fecha Rad.` | Copiar el valor de `fecha_fin` directamente a `Fecha Rad.` |

- **Formato de fecha**: `MM/DD/YYYY` (ejemplo: `08/30/2026`)
- **Ejemplo**: Si `fecha_fin` = `08/30/2026`, entonces `Fecha Rad.` = `08/30/2026`

#### Excepcion AZPEN (importante)

Para **UNITED PARCEL SERVICE AZPEN** en `Nomina_Historico`:

- Las filas **semanales** (`codigo` empieza con `WK-`) **NO se radican**. Quedan sin `Fecha Rad.` permanentemente.
- De AZPEN solo se radican las filas **quincenales unificadas** (`codigo` empieza con `Q-`).
- Para las demas tiendas no hay excepcion: todas sus filas se radican normalmente.

### 2. Tabla: `Proyectos_Especiales`

| Columna origen | Columna destino | Regla |
|---|---|---|
| `Periodo` | `Fecha Rad.` | Extraer la **segunda fecha** del campo `Periodo` (la que esta despues del guion ` - `) |

- **Formato de `Periodo`**: `MM/DD/YYYY - MM/DD/YYYY` (ejemplo: `08/09/2026 - 08/15/2026`)
- **Ejemplo**: Si `Periodo` = `08/09/2026 - 08/15/2026`, entonces `Fecha Rad.` = `08/15/2026`

---

## Criterio de Filtrado

En ambas tablas, solo se actualizan las filas donde:

```sql
"Fecha Rad." IS NULL OR "Fecha Rad." = ''
```

**Nunca** se deben modificar filas que ya tienen una fecha en `Fecha Rad.`

Ademas, en `Nomina_Historico` se aplica la **excepcion AZPEN**: las filas de **UNITED PARCEL SERVICE AZPEN** con `codigo` que empieza con `WK-` se excluyen siempre de la radicacion:

```sql
NOT (
  UPPER(TRIM(nombre)) = 'UNITED PARCEL SERVICE AZPEN'
  AND codigo LIKE 'WK-%'
)
```

---

## Pre-requisitos

1. Tener `flyctl` instalado y autenticado
2. Tener acceso a la app `logicpay` en Fly.io
3. **Hacer un backup de la base de datos** antes de ejecutar cualquier cambio (solo bajo autorizacion del Director)

---

## Proceso de Ejecucion

### Paso 1: Inspeccionar el estado actual

Consultar cuantas filas necesitan radicacion antes de ejecutar el UPDATE.

#### Nomina_Historico

```javascript
// Script: check_nomina.cjs
const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');

// Excepcion AZPEN: excluir filas semanales WK- de UNITED PARCEL SERVICE AZPEN
const EXCLUIR_AZPEN_WK = `NOT (UPPER(TRIM(nombre)) = 'UNITED PARCEL SERVICE AZPEN' AND codigo LIKE 'WK-%')`;

const total = db.prepare('SELECT COUNT(*) as cnt FROM Nomina_Historico').get();
const sinFecha = db.prepare(`SELECT COUNT(*) as cnt FROM Nomina_Historico WHERE ("Fecha Rad." IS NULL OR "Fecha Rad." = '') AND ${EXCLUIR_AZPEN_WK}`).get();
const excluidas = db.prepare(`SELECT COUNT(*) as cnt FROM Nomina_Historico WHERE ("Fecha Rad." IS NULL OR "Fecha Rad." = '') AND NOT ${EXCLUIR_AZPEN_WK}`).get();

console.log('Total filas:', total.cnt);
console.log('Sin Fecha Rad. (radicables):', sinFecha.cnt);
console.log('Sin Fecha Rad. excluidas (AZPEN WK-, no se radican):', excluidas.cnt);
console.log('Con Fecha Rad.:', total.cnt - sinFecha.cnt - excluidas.cnt);

if (sinFecha.cnt > 0) {
  const ejemplos = db.prepare(`SELECT id, nombre, codigo, fecha_inicio, fecha_fin, "Fecha Rad." FROM Nomina_Historico WHERE ("Fecha Rad." IS NULL OR "Fecha Rad." = '') AND ${EXCLUIR_AZPEN_WK} ORDER BY id DESC LIMIT 10`).all();
  console.log('\nEjemplos de filas sin Fecha Rad. (radicables):');
  console.log(JSON.stringify(ejemplos, null, 2));
}
```

#### Proyectos_Especiales

```javascript
// Script: check_pe.cjs
const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');

const total = db.prepare('SELECT COUNT(*) as cnt FROM Proyectos_Especiales').get();
const sinFecha = db.prepare('SELECT COUNT(*) as cnt FROM Proyectos_Especiales WHERE "Fecha Rad." IS NULL OR "Fecha Rad." = \'\'').get();

console.log('Total filas:', total.cnt);
console.log('Sin Fecha Rad.:', sinFecha.cnt);
console.log('Con Fecha Rad.:', total.cnt - sinFecha.cnt);

if (sinFecha.cnt > 0) {
  const ejemplos = db.prepare('SELECT id, Tienda, Correlativo, Periodo, "Fecha Rad." FROM Proyectos_Especiales WHERE "Fecha Rad." IS NULL OR "Fecha Rad." = \'\' ORDER BY id DESC LIMIT 10').all();
  console.log('\nEjemplos de filas sin Fecha Rad.:');
  console.log(JSON.stringify(ejemplos, null, 2));
}
```

---

### Paso 2: Ejecutar la radicacion

#### Nomina_Historico — Script de actualizacion

```javascript
// Script: radicar_nomina.cjs
const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');

console.log('=== RADICAR NOMINA_HISTORICO ===');

// Excepcion AZPEN: excluir filas semanales WK- de UNITED PARCEL SERVICE AZPEN (solo se radican sus Q-)
const EXCLUIR_AZPEN_WK = `NOT (UPPER(TRIM(nombre)) = 'UNITED PARCEL SERVICE AZPEN' AND codigo LIKE 'WK-%')`;

const antes = db.prepare(`SELECT COUNT(*) as cnt FROM Nomina_Historico WHERE ("Fecha Rad." IS NULL OR "Fecha Rad." = '') AND ${EXCLUIR_AZPEN_WK}`).get();
console.log('Filas radicables sin Fecha Rad. antes:', antes.cnt);

const stmt = db.prepare(`UPDATE Nomina_Historico SET "Fecha Rad." = "fecha_fin" WHERE ("Fecha Rad." IS NULL OR "Fecha Rad." = '') AND ${EXCLUIR_AZPEN_WK}`);
const result = stmt.run();
console.log('Filas actualizadas:', result.changes);

const despues = db.prepare(`SELECT COUNT(*) as cnt FROM Nomina_Historico WHERE ("Fecha Rad." IS NULL OR "Fecha Rad." = '') AND ${EXCLUIR_AZPEN_WK}`).get();
console.log('Filas radicables sin Fecha Rad. despues:', despues.cnt);
console.log('(Las AZPEN WK- excluidas deben seguir sin Fecha Rad. — es lo esperado)');

console.log('\n=== LISTO ===');
```

#### Proyectos_Especiales — Script de actualizacion

```javascript
// Script: radicar_pe.cjs
const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');

console.log('=== RADICAR PROYECTOS_ESPECIALES ===');

const antes = db.prepare('SELECT COUNT(*) as cnt FROM Proyectos_Especiales WHERE "Fecha Rad." IS NULL OR "Fecha Rad." = \'\'').get();
console.log('Filas sin Fecha Rad. antes:', antes.cnt);

// Extraer la segunda fecha del campo Periodo (despues del " - ")
const filas = db.prepare('SELECT id, Periodo FROM Proyectos_Especiales WHERE "Fecha Rad." IS NULL OR "Fecha Rad." = \'\'').all();
let actualizadas = 0;

const update = db.prepare('UPDATE Proyectos_Especiales SET "Fecha Rad." = ? WHERE id = ?');
const tx = db.transaction(() => {
  for (const fila of filas) {
    const partes = (fila.Periodo || '').split(' - ');
    if (partes.length === 2 && partes[1].trim()) {
      update.run(partes[1].trim(), fila.id);
      actualizadas++;
    } else {
      console.log(`Fila ${fila.id}: Periodo no tiene formato esperado: "${fila.Periodo}"`);
    }
  }
});
tx();

console.log('Filas actualizadas:', actualizadas);

const despues = db.prepare('SELECT COUNT(*) as cnt FROM Proyectos_Especiales WHERE "Fecha Rad." IS NULL OR "Fecha Rad." = \'\'').get();
console.log('Filas sin Fecha Rad. despues:', despues.cnt);

console.log('\n=== LISTO ===');
```

---

### Paso 3: Ejecutar en Fly.io

#### Subir el script al servidor

```powershell
flyctl ssh sftp put "C:\ruta\local\script.cjs" /app/script.cjs -a logicpay
```

#### Ejecutar el script

```powershell
flyctl ssh console -C "node /app/script.cjs" -a logicpay
```

#### Verificar resultados (solo lectura, sin subir script)

```powershell
# Nomina_Historico: el conteo de pendientes excluye las WK- de AZPEN (no se radican)
$data = (Invoke-WebRequest -Uri "https://logicpay.fly.dev/api/data/Nomina_Historico" -UseBasicParsing).Content | ConvertFrom-Json
$esAzpenWK = { param($r) ($r.nombre -and $r.nombre.Trim().ToUpper() -eq 'UNITED PARCEL SERVICE AZPEN') -and ($r.codigo -and $r.codigo.ToString().StartsWith('WK-')) }
$total = $data.Count
$sinFecha = ($data | Where-Object { -not $esAzpenWK.Invoke($_) -and (-not $_.'Fecha Rad.' -or $_.'Fecha Rad.' -eq '') }).Count
$excluidas = ($data | Where-Object { $esAzpenWK.Invoke($_) -and (-not $_.'Fecha Rad.' -or $_.'Fecha Rad.' -eq '') }).Count
Write-Host "Total: $total | Pendientes radicables: $sinFecha | AZPEN WK- excluidas: $excluidas | Con Fecha Rad.: $($total - $sinFecha - $excluidas)"
```

```powershell
$data = (Invoke-WebRequest -Uri "https://logicpay.fly.dev/api/data/Proyectos_Especiales" -UseBasicParsing).Content | ConvertFrom-Json
$total = $data.Count
$sinFecha = ($data | Where-Object { -not $_.'Fecha Rad.' -or $_.'Fecha Rad.' -eq '' }).Count
Write-Host "Total: $total | Sin Fecha Rad.: $sinFecha | Con Fecha Rad.: $($total - $sinFecha)"
```

---

### Paso 4: Limpiar archivos temporales

Eliminar los scripts `.cjs` subidos al servidor:

```powershell
flyctl ssh console -C "rm /app/script.cjs" -a logicpay
```

Eliminar los scripts locales:

```powershell
Remove-Item "C:\ruta\local\script.cjs" -ErrorAction SilentlyContinue
```

---

## Resumen Visual del Proceso

```
┌─────────────────────────────────────────────────────────┐
│                  RADICAR FACTURAS                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. INSPECCIONAR                                        │
│     └─> Contar filas sin "Fecha Rad."                   │
│         (excluye AZPEN WK-, no radicables)              │
│                                                         │
│  2. RADICAR (solo si hay filas pendientes)               │
│     ├─> Nomina_Historico:     Fecha Rad. = fecha_fin    │
│     │    (EXCEPTO: AZPEN solo Q-, nunca sus WK-)         │
│     └─> Proyectos_Especiales: Fecha Rad. = 2da fecha    │
│         del Periodo (despues del " - ")                  │
│                                                         │
│  3. VERIFICAR                                           │
│     └─> Confirmar que no queden filas pendientes        │
│                                                         │
│  4. LIMPIAR                                             │
│     └─> Eliminar scripts temporales del servidor        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Notas Importantes

1. **Backup primero**: Siempre tener un backup de la base de datos antes de ejecutar cambios. Solo el Director puede autorizar el backup.

2. **Sin deploy sin autorizacion**: Nunca ejecutar `npm run deploy` o similar sin autorizacion explicita del Director.

3. **Frecuencia**: La radicacion se realiza **varias veces al dia** mientras los asistentes cargan nuevas facturaciones.

4. **Scripts temporales**: Los archivos `.cjs` subidos al servidor deben eliminarse despues de cada ejecucion.

5. **Verificacion siempre**: Despues de cada radicacion, verificar que no queden filas sin `Fecha Rad.`

6. **Error comun**: Si el servidor devuelve "Error: The handle is invalid.", esto es un problema de PowerShell, no del script. El script generalmente se ejecuto correctamente.

7. **Excepcion AZPEN**: Las facturaciones **semanales `WK-` de UNITED PARCEL SERVICE AZPEN NO se radican**. De AZPEN solo se radican las filas **quincenales `Q-`**. Los conteos de "pendientes" y los scripts de radicacion ya excluyen esas filas; verlas sin `Fecha Rad.` es el comportamiento esperado, no un error.

---

## Comandos Utiles Rapidos

| Accion | Comando |
|---|---|
| Verificar estado Nomina_Historico | Ver script `check_nomina.cjs` en Paso 1 |
| Verificar estado Proyectos_Especiales | Ver script `check_pe.cjs` en Paso 1 |
| Radicar Nomina_Historico | Ver script `radicar_nomina.cjs` en Paso 2 |
| Radicar Proyectos_Especiales | Ver script `radicar_pe.cjs` en Paso 2 |
| Subir script al servidor | `flyctl ssh sftp put LOCAL_PATH /app/SCRIPT.cjs -a logicpay` |
| Ejecutar script en servidor | `flyctl ssh console -C "node /app/SCRIPT.cjs" -a logicpay` |
| Verificar via API (solo lectura) | Ver comandos PowerShell en Paso 3 |
| Eliminar script del servidor | `flyctl ssh console -C "rm /app/SCRIPT.cjs" -a logicpay` |
