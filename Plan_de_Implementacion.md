# Plan de Implementación: Migración de Google Sheets a SQLite

El siguiente plan detalla el proceso paso a paso para migrar el sistema de almacenamiento de datos actual, basado en hojas de cálculo de Google Sheets (descargadas como archivos `.csv`), a una base de datos **SQLite**. Esto resolverá el problema de latencia/cacheo que provoca que los datos guardados no se reflejen inmediatamente en la interfaz de usuario.

## Planteamiento del Problema
Actualmente, la aplicación de React (Vite) lee y escribe datos interactuando con Google Sheets. Las lecturas se realizan obteniendo archivos `.csv` publicados en internet. Esto causa demoras e inconsistencias temporales en la interfaz de usuario debido al caché de Google Sheets o a la latencia de red, obligando al usuario a refrescar la página múltiples veces (F5) para ver los últimos cambios. Al migrar a SQLite, las lecturas y escrituras serán transaccionales, directas e inmediatas, resolviendo el problema.

---

> [!TIP]
> **Despliegue en Fly.io y Eficiencia**
> Ya que el sistema se desplegará en **Fly.io**, utilizaremos una arquitectura con un servidor backend ligero en Node.js (Express) para exponer la base de datos SQLite a la aplicación React. 
> Para garantizar la máxima eficiencia de lectura y escritura:
> 1. Utilizaremos la librería `better-sqlite3`, la cual es síncrona y es la opción más rápida disponible para SQLite en Node.js, ideal para cargas de trabajo eficientes.
> 2. Mantendremos el archivo `.db` en una ruta configurable para que en Fly.io se pueda montar en un **Fly Volume** (volumen persistente), asegurando que los datos no se pierdan entre reinicios del servidor.

---

## Fases de Implementación

### Fase 1: Preparación y Configuración del Entorno SQLite
**Objetivo:** Configurar el entorno necesario para interactuar con bases de datos SQLite.
- **Subfase 1.1:** Instalar dependencias para el servidor backend: `express`, `cors`, y `better-sqlite3` (librería de alto rendimiento).
- **Subfase 1.2:** Crear la estructura del backend (ej. carpeta `server/`) y el archivo de conexión a SQLite apuntando a `data/database.db`. La ruta será relativa o configurable mediante variables de entorno para su futura persistencia en Fly.io.
- **Subfase 1.3:** Implementar y levantar el servidor Express básico, y configurarlo para servir junto a Vite durante el desarrollo.

### Fase 2: Diseño de la Base de Datos SQLite
**Objetivo:** Crear las tablas necesarias dentro de SQLite que reemplazarán a las hojas de Google Sheets.
- **Subfase 2.1:** Analizar la estructura de columnas de los principales archivos CSV (`Variables`, `Personal`, `Nomina_Historico`, `Tiendas`, etc.).
- **Subfase 2.2:** Escribir y ejecutar el script SQL de creación de tablas (`CREATE TABLE ...`) asignando los tipos de datos correctos a cada campo.

### Fase 3: Migración de Datos Existentes (CSV a SQLite)
**Objetivo:** Poblar la nueva base de datos SQLite con los datos actuales de los archivos `.csv` de la carpeta `data`.
- **Subfase 3.1:** Desarrollar un script temporal de migración en Node.js que lea todos los archivos `.csv` (ej. `LogicPay Database - Personal.csv`) y los inserte en sus respectivas tablas SQLite recién creadas.
- **Subfase 3.2:** Ejecutar el script y validar que el archivo `data/database.db` contiene todos los registros correctamente formateados.

### Fase 4: Adaptación del Código Frontend (Módulo de Lectura)
**Objetivo:** Cambiar la lógica de la aplicación para que deje de obtener los datos de las URLs de los CSV y comience a leerlos desde SQLite.
- **Subfase 4.1:** Identificar los servicios, hooks o funciones dentro de `src` donde se realizan las peticiones `fetch` a Google Sheets/CSV.
- **Subfase 4.2:** Modificar el código para que haga las peticiones `GET` a la nueva base de datos (o API local).
- **Subfase 4.3:** Probar que la interfaz cargue correctamente los datos en las tablas de la aplicación.

### Fase 5: Adaptación del Código Frontend (Módulo de Escritura)
**Objetivo:** Cambiar la lógica para que los guardados y modificaciones vayan directo a SQLite.
- **Subfase 5.1:** Rastrear las funciones que actúan al presionar los botones de "Guardar", "Actualizar" o "Eliminar".
- **Subfase 5.2:** Implementar las llamadas a la base de datos local (peticiones `POST`/`PUT`/`DELETE` a la API local) para modificar la tabla correspondiente.
- **Subfase 5.3:** Validar que, al guardar un dato nuevo, este se refleje inmediatamente en la interfaz sin necesidad de presionar F5.

### Fase 6: Limpieza y Pruebas Finales
**Objetivo:** Asegurar la estabilidad total del sistema.
- **Subfase 6.1:** Realizar un flujo completo de prueba en la aplicación (crear, leer, actualizar, eliminar registros).
- **Subfase 6.2:** Eliminar el código legado que apuntaba a Google Sheets. (Los archivos CSV se dejarán en la carpeta `data` hasta que tú decidas eliminarlos, como indicaste en las reglas).

---
*Nota: Al finalizar cada una de estas fases, me detendré, te informaré de los resultados y esperaré tu autorización explícita para marcar la fase con `[x]` como completada y proceder con la siguiente fase.*
