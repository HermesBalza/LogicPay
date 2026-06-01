# AGENTS.md — Logic Group Management (LogicPay)

## Stack
- **Frontend**: React 18 + Vite 5 (JSX), Tailwind CSS 3, lucide-react icons
- **Backend**: Express 5 + better-sqlite3 (SQLite, WAL mode)
- **AI**: Gemini via `POST /api/gemini/generate` (server-side proxy, `@google/generative-ai` solo en backend)
- **Charts/PDF/Excel**: recharts, jspdf+html2canvas, xlsx
- **CSS**: Font Inter via Google Fonts, brand colors in `tailwind.config.cjs` (primary: `#303a7f`, accent: `#6bbdb7`, dark: `#333333`, bg: `#f9f9f9`)

## Architecture
- **Entrypoints**: `src/main.jsx` → `App.jsx` (SPA); `server/index.js` (Express, port 3001)
- **All main views in App.jsx**: LoginView, DashboardView, SupportChat. Imported modules: CSGModule.jsx, Notes.jsx, ResumenView.jsx, CRMView.jsx.
- **Database**: Schema defined in `server/init_db.js` (canonical). Tables auto-created in `server/db.js` on startup. At `data/database.db`.
- **Vite proxy**: `/api` → `http://localhost:3001`

## Commands
| Command | Description |
|---|---|
| `npm run dev` | Vite dev server only |
| `npm run server` | Express backend (port 3001) |
| `npm run dev:full` | Both Vite + Express via concurrently |
| `npm run build` | Vite production build |
| `npm run lint` | ESLint (js,jsx only, `--max-warnings 0`) |
| `node server/init_db.js` | Initialize DB schema |
| `node server/migrate.js` | CSV → SQLite migration |

## API (backend, port 3001)
- `GET /api/data/:table` — Read from 16 allowed tables
- `POST /api/write` — `action: upsert|delete|reserveInvoice`, uses `matchKeys` for upsert matching
- Notes CRUD: `GET/POST /api/notas`, `PUT/DELETE /api/notas/:id`, `POST /api/notas/:id/read`, `GET /api/notas/unread/:userId`
- `GET /api/config` — Read config variables (values masked)
- `POST /api/config/save` — Update config variables
- `POST /api/gemini/generate` — Gemini AI proxy (reads `gemini_api_key` from Variables table)
- `POST /api/send-email` — Email proxy (reads `mail_api_url_*` from Variables table)

## Database Tables
Tiendas, Personal, Nomina_Historico, Nomina_Detalle, Proyectos_Especiales, WOS, Variables, CSG_Servicios, CSG_Nomina, Personal_Admin, Admin_Nomina_Historico, WOS_CSG, Notas (threaded), NotasLeidas, VASchedule, CRM_Candidatos, CRM_Proveedores, CRM_Proyectos, CRM_Cotizaciones.

## Conventions
- **CSS**: Tailwind utility-first. Custom btn-primary/card classes in `index.css`. Scrollbar styled brand-primary.
- **Typography**: `font-black` (900) and `font-bold` (700) extensively, `tracking-widest`/`tracking-tighter`, tiny uppercase labels (`text-[9px]`/`text-[10px]`). Login badge hardcoded to password `admin`.
- **Config variables** (`gemini_api_key`, `mail_api_url_general`, `mail_api_url_payroll`) stored en Variables table, auto-seeded en server start, gestionadas via SettingsView → General.
- **No secrets in frontend**: Gemini y email se proxean por backend; nunca se envían claves/URLs al navegador.
- **No ESLint config file** found — project relies on Vite defaults.
- **Gitignore**: `.env`, `PROJECT_RULES.md`, `data/database.db*`, `server_*.txt`, `vite_*.txt`, `full_app_output.txt`.

## Migration
- `node server/migrate.js` reads CSVs from `data/` matching pattern `LogicPay Database - <Table>.csv`, DELETEs all rows from target table, then bulk-inserts.
- CSV filenames must match exactly the `filesToMigrate` array in `migrate.js`.

## Reglas del Director (Hermes Balza)
1. Prohibido hacer deploy sin autorización explícita.
2. Prohibido hacer backup en GitHub sin autorización explícita.
3. Prohibido ejecutar `npm run dev` sin autorización explícita.
4. Ante la frase "Solo respóndeme lo siguiente", responder solo en conversación sin hacer cambios en nada.
5. Prohibido hacer cambios en el código sin autorización.
6. Los comentarios de commits en GitHub deben ser en Español.
7. Prohibido hacer mención textual de la frase "Nivel Dios" dentro del código o interfaz.
8. Prohibido tomar control del navegador sin autorización.
9. Todo Plan de Implementación debe ser escrito en español.
