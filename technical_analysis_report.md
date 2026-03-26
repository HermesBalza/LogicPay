# Análisis Técnico Exhaustivo: Proyecto LogicPay

Este documento detalla el análisis línea por línea y la arquitectura técnica del sistema **LogicPay**, diseñado para la gestión de nómina de **Logic Group Management (LGM)**.

## 1. Arquitectura de Alto Nivel
*   **Frontend**: React (Vite) con Tailwind CSS.
*   **Estado**: Monolito centralizado en `App.jsx` (~6800 líneas) que gestiona UI, lógica de negocio y sincronización.
*   **Base de Datos (Transaccional)**: Google Sheets mediante un Motor de Apps Script customizado.
*   **Lectura de Datos**: Consumo de archivos CSV publicados de Google Sheets para máxima velocidad de carga.
*   **Motor de IA**: Google Gemini (integración directa vía `@google/generative-ai`).

---

## 2. Lógica de Identidad y Unicidad (Regla de Oro)
El sistema utiliza una **Llave Compuesta** para garantizar la integridad de los datos en Google Sheets (donde no existen IDs autoincrementales nativos de confianza).
*   **Llave**: `Nombre + Código`.
*   **Formato Crítico**: Todos los códigos (Tiendas y Empleados) se guardan con el prefijo `'` (comilla simple) para evitar que Google Sheets elimine ceros a la izquierda (ej: `'00123`).
*   **Ubicación**: Definido en `csvRowToStore` (linea ~200) y `csvRowToEmployee` (linea ~230).

---

## 3. Motores de Inteligencia Artificial (Gemini)

### A. Crossover Biométrico (IVR)
*   **Función**: Procesa archivos CSV de ponches biométricos (multi-punch).
*   **Lógica**: Agrupa por ID, identifica fechas, suma duraciones y mapea el día de la semana.
*   **Código**: Función `runAICrossoverInternal` (línea ~4686).
*   **Observación**: Actualmente utiliza el modelo `gemini-3-flash-preview`. *Hermes ha indicado que el estándar debe ser 2.5 Flash.*

### B. Digitalizador de Planillas (Vision)
*   **Función**: Digitaliza fotos de planillas escritas a mano.
*   **Lógica**:
    *   Fuzzy Matching contra el registro de personal local.
    *   Exclusión estricta de empleados de la compañía "KBS".
    *   Detección agnóstica de fechas y horas manuales.
*   **Código**: Función `processSheetImagesWithAI` (línea ~4922).
*   **Salida**: Genera un archivo `.xlsx` basado en un template oficial.

---

## 4. Gestión de Nómina y Proyectos Especiales (P.E)

### Ciclo Semanal
*   Inamovible: **Domingo a Sábado**.
*   Utilidad: `getFormattedDateForDay` y `getFullDateForDay` (líneas ~150-180).

### Matriz Salarial LSG vs KBS
*   El sistema maneja tarifas duales por cargo (Janitorial, Utility, Shift Lead).
*   **LSG**: Monto pagado al empleado.
*   **KBS**: Monto facturado al cliente.
*   La diferencia constituye el margen operativo de LGM.

### Proyectos Especiales (P.E)
*   Integrado en el flujo bisemanal (línea ~4000).
*   Utiliza un sistema de correlativo `nextInvoice` (iniciando en 100).
*   **Historial de Ubicaciones**: Cada registro en un P.E. marca al empleado con el color naranja en la UI y actualiza su historial (`locationHistory`).

---

## 5. Persistencia y Sincronización
*   **API_URL**: Endpoint de Apps Script configurado en las primeras líneas de `App.jsx`.
*   **Método Sync**: `syncToSheets` (línea ~5205).
*   **Seguridad**: API Key gestionada en `localStorage` o `.env.local`.

---

## 6. Observaciones Técnicas y Recomendaciones
1.  **Divergencia de Versión AI**: El código usa `gemini-3-flash-preview` pero el Director solicita `2.5-flash`. Se recomienda estandarizar.
2.  **Complejidad del Monolito**: `App.jsx` ha superado el límite de mantenibilidad ideal. Se sugiere una refactorización modular a futuro (si el Director lo autoriza).
3.  **Manejo de CORS**: Implementado exitosamente mediante `mode: 'no-cors'` y `Content-Type: 'text/plain'` para hablar con Google Apps Script.

---
**Análisis completado al 100% por Antigravity.**
