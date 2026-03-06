# SIA UNAL MCP Server

MCP server para el Sistema de Informacion Academica (SIA) de la Universidad Nacional de Colombia.

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

Crea un archivo `.env` en la raiz del proyecto con las variables necesarias:

```bash
touch .env
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
      "args": ["/user/mcps/sia-unal/dist/index.js"],
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
| `list-faculties` | Listar facultades disponibles para un nivel academico |
| `list-programs` | Listar programas de estudio de una facultad |
| `search-courses` | Buscar asignaturas en el catalogo por facultad y programa |
| `get-course-groups` | Obtener grupos, horarios, profesores y salones de una asignatura |
| `check-seat-availability` | Consultar cupos disponibles en tiempo real por grupo |
| `get-course-details` | Detalles completos de una asignatura (descripcion, prerrequisitos) |

### Autenticados (requieren credenciales UN)

| Tool | Descripcion |
|------|-------------|
| `authenticate` | Login con credenciales institucionales |
| `get-grades` | Notas por periodo o todas |
| `get-current-schedule` | Horario actual matriculado |
| `get-academic-history` | Historial academico completo + PAPA |
| `get-enrollment-status` | Estado de matricula y creditos |

## Ejemplos de uso

### Sin autenticacion

```
# Listar facultades de pregrado en Medellin
list-faculties(level="Pregrado", sede="MEDELLÍN")

# Listar programas de una facultad
list-programs(level="Pregrado", faculty="Facultad de Minas", sede="MEDELLÍN")

# Buscar asignaturas de un programa
search-courses(level="Pregrado", faculty="Facultad de Minas", program="Ingenieria de Sistemas e Informatica")

# Consultar cupos de una asignatura
check-seat-availability(courseCode="3007747")
```

Tambien puedes preguntarle a Claude directamente:
- "Que asignaturas hay en Ingenieria de Sistemas en Medellin?"
- "Cuantos cupos quedan en la asignatura 3007747?"
- "Muestrame los horarios de algoritmos"

### Con autenticacion

```
# Iniciar sesion
authenticate(username="tuusuario", password="tucontrasena")

# Ver notas del semestre actual
get-grades()

# Ver historial academico completo con PAPA
get-academic-history()
```

Tambien puedes pedirle a Claude:
- "Inicia sesion con mi usuario X y muestrame mis notas del semestre"
- "Cual es mi PAPA acumulado?"

## Arquitectura

- **JSON-RPC**: Endpoint no documentado del SIA para busquedas rapidas (sin autenticacion)
- **Playwright + ADF**: Navegacion del catalogo publico mediante Playwright headless que maneja el cascading de dropdowns de Oracle ADF via Partial Page Rendering (PPR). Usado por `list-faculties`, `list-programs`, `search-courses` y `get-course-details`.
- **Playwright + OAM**: Autenticacion institucional via Oracle Access Manager para los tools que requieren sesion.

## Seguridad

- Las credenciales NUNCA se almacenan en disco
- Las sesiones expiran automaticamente despues de 20 minutos
- Se recomienda usar variables de entorno para credenciales
- El rate limiter previene sobrecarga del servidor SIA
