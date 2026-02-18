# SIA UNAL MCP Server

MCP server para el Sistema de Informacion Academica (SIA) de la Universidad Nacional de Colombia, Sede Medellin.

Permite buscar asignaturas, consultar horarios, cupos, notas e historial academico a traves de Claude u otro cliente MCP.

## Requisitos

- Node.js 20+
- Playwright (se instala automaticamente)

## Instalacion

```bash
npm install
npx playwright install chromium
npm run build
```

## Configuracion

Copia `.env.example` a `.env` y configura las variables necesarias:

```bash
cp .env.example .env
```

### Variables de entorno

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `SIA_SEDE` | Sede: medellin, bogota, manizales, palmira | medellin |
| `SIA_USERNAME` | Usuario UN (solo para tools autenticados) | - |
| `SIA_PASSWORD` | Contrasena UN (solo para tools autenticados) | - |
| `PLAYWRIGHT_HEADLESS` | Ejecutar browser sin ventana | true |
| `RATE_LIMIT_DELAY` | Delay entre requests (ms) | 2000 |
| `CACHE_TTL` | Tiempo de vida del cache (ms) | 300000 |

## Uso con Claude Desktop

Agrega al archivo de configuracion de Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sia-unal": {
      "command": "node",
      "args": ["/Users/sebastiansepulveda/Projects/mcps/sia-unal/dist/index.js"],
      "env": {
        "SIA_SEDE": "medellin"
      }
    }
  }
}
```

## Tools disponibles

### Publicos (sin autenticacion)

| Tool | Descripcion |
|------|-------------|
| `search-courses` | Buscar asignaturas por palabra clave |
| `get-course-groups` | Obtener grupos/horarios de una asignatura |
| `check-seat-availability` | Cupos disponibles en tiempo real |
| `browse-catalog` | Navegar catalogo por facultad/programa |
| `get-course-details` | Detalles completos de una asignatura |

### Autenticados (requieren credenciales UN)

| Tool | Descripcion |
|------|-------------|
| `authenticate` | Login con credenciales institucionales |
| `get-grades` | Notas por periodo o todas |
| `get-current-schedule` | Horario actual matriculado |
| `get-academic-history` | Historial academico completo + PAPA |
| `get-enrollment-status` | Estado de matricula y creditos |

## Ejemplos de uso

Preguntale a Claude cosas como:
- "Que cursos de programacion hay disponibles?"
- "Cuantos cupos quedan en la asignatura 3007747?"
- "Muestrame los horarios de algoritmos"
- "Inicia sesion con mi usuario X y muestrame mis notas del semestre"

## Arquitectura

- **JSON-RPC**: Endpoint no documentado del SIA para busquedas rapidas (sin autenticacion)
- **Playwright**: Para interacciones con la UI dinamica de Oracle ADF y autenticacion via OAM

## Seguridad

- Las credenciales NUNCA se almacenan en disco
- Las sesiones expiran automaticamente despues de 20 minutos
- Se recomienda usar variables de entorno para credenciales
- El rate limiter previene sobrecarga del servidor SIA
