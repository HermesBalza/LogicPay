# Logic Group Management (LGM) - Análisis de Arquitectura y Lógica de Negocio

Este documento resume el entendimiento total (100%) del sistema LogicPay desarrollado para Logic Group Management (LGM) por AdWisers LLC.

## 1. Modelo de Negocio (LGM vs. KBS)
El sistema gestiona la tercerización de servicios de limpieza.
- **KBS**: Cliente principal que contrata a LGM.
- **LGM**: Proveedor que emplea al personal.
- **Matriz Salarial Dual**: Cada cargo (Janitorial, Utility, Shift Lead) tiene dos tarifas:
    - **Tarifa KBS**: Lo que KBS paga a LGM por hora de trabajo.
    - **Tarifa LGM**: Lo que LGM paga al empleado por hora de trabajo.
- **Margen Operativo**: La ganancia de LGM es la diferencia entre la Tarifa KBS y la Tarifa LGM multiplicada por las horas trabajadas.

## 2. Arquitectura Tecnológica
- **Frontend**: React (Vite), Tailwind CSS, Lucide React.
- **Estado**: Gestión de estado centralizada en `App.jsx` (Monolito de ~6000 líneas).
- **Persistencia/Backend**:
    - Google Sheets como base de datos central.
    - Google Apps Script (`doPost`) como motor de sincronización.
    - Comunicación vía `fetch` (mode: 'no-cors', Content-Type: 'text/plain').
- **Bibliotecas Clave**:
    - `xlsx`: Procesamiento de reportes Excel (Supervisor/Biométrico).
    - `jspdf` & `html2canvas`: Generación de reportes PDF (Consolidado Bisemanal).
    - `@google/generative-ai`: Integración con Gemini Flash para procesamiento de datos.

## 3. Integridad y Unicidad de Datos
- **Llave Compuesta**: La identidad única de cada registro se basa en la combinación de **Nombre + Código**.
- **Preservación de Formato**: Todos los códigos (Tiendas/Empleados) se guardan con un prefijo de comilla simple (`'`) para evitar que Google Sheets elimine ceros a la izquierda (ej: `'0123`).
- **Sincronización**: La función `syncToSheets` envía acciones de `upsert` o `delete` al servidor de Apps Script.

## 4. Motor de Nómina (Payroll Engine)
El cálculo de nómina sigue un proceso de auditoría triple:
1. **Reporte del Supervisor (S)**: Carga manual de horas reportadas por los supervisores.
2. **Reporte Biométrico/IVR (B)**: Procesado mediante IA (Gemini) a partir de ponches crudos de entrada/salida.
3. **Auditoría Manual**: El usuario puede elegir entre (S) o (B) para cada día, o ingresar una cifra manual.
4. **Cruce de Datos (Crossover)**: La IA agrupa ponches por ID, suma duraciones diarias y detecta inconsistencias.

## 5. Inteligencia Artificial (Gemini)
- **Cruce Biométrico**: Gemini procesa el CSV de ponches, agrupa por ID y calcula horas diarias en formato HH:MM.
- **Digitalizador de Planillas**: Gemini Vision escanea fotos de planillas manuscritas, realiza match con la base de datos de personal (Fuzzy Matching) y genera un Excel de carga compatible con el sistema.

## 6. Historial y Reportes
- **Nomina_Historico**: Cada semana aprobada se guarda como un objeto JSON en Google Sheets, permitiendo la reconstrucción total de la vista del motor de nómina en cualquier momento.
- **Consolidado Bisemanal**: Proceso que une dos semanas (W1 + W2) para generar el reporte de pago final. Sigue el "Molde Hermes" (mínimo 20 filas en el PDF).
- **Location History**: El sistema rastrea automáticamente en qué tienda estuvo cada empleado basándose en la aprobación de nómina, manteniendo un historial cronológico.

## 7. Reglas Críticas del Director (Hermes Balza)
- **Prohibido**: `deploy`, `backup` en GitHub o `npm run dev` sin autorización.
- **Convenciones**: Mensajes de commit en Español. Prohibido usar "Nivel Dios" en el código.
- **Seguridad**: API Keys gestionadas en Ajustes (localStorage), no hardcodeadas.
- **Modelo IA**: Uso obligatorio de Gemini 2.5 Flash (configurado en el entorno de desarrollo).

---
*Documento generado por Antigravity - 25 de Marzo de 2026*
