import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  searchCoursesSchema,
  courseGroupsSchema,
  browseCatalogSchema,
  courseDetailsSchema,
  seatAvailabilitySchema,
  authenticateSchema,
  gradesSchema,
} from "./config/schemas.js";
import { searchCourses } from "./scrapers/course-search.js";
import { getCourseGroups, checkSeatAvailability } from "./scrapers/course-groups.js";
import { browseCatalogByFaculty, getFullCourseDetails } from "./scrapers/catalog-browse.js";
import { authenticate, getSessionState } from "./auth/session-manager.js";
import { getGrades } from "./scrapers/grades.js";
import { getCurrentSchedule } from "./scrapers/schedule.js";
import { getEnrollmentStatus } from "./scrapers/enrollment.js";
import { getAcademicHistory } from "./scrapers/academic-history.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "sia-unal",
    version: "1.0.0",
  });

  // === PUBLIC TOOLS ===

  server.tool(
    "search-courses",
    "Buscar asignaturas por palabra clave en el SIA UNAL. Retorna nombre, código, créditos y tipología.",
    searchCoursesSchema.shape,
    async (params) => {
      try {
        const result = await searchCourses(
          params.query,
          params.level,
          params.typology,
          params.page,
          params.pageSize
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error buscando asignaturas: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get-course-groups",
    "Obtener los grupos, horarios, docentes y aulas de una asignatura específica por su código.",
    courseGroupsSchema.shape,
    async (params) => {
      try {
        const groups = await getCourseGroups(params.courseCode);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(groups, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error obteniendo grupos: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "check-seat-availability",
    "Consultar cupos disponibles en tiempo real para una asignatura. Muestra cupos totales y disponibles por grupo.",
    seatAvailabilitySchema.shape,
    async (params) => {
      try {
        const availability = await checkSeatAvailability(params.courseCode);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(availability, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error consultando cupos: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "browse-catalog",
    "Navegar el catálogo de asignaturas por nivel, facultad y programa. Usa Playwright para interactuar con la UI del SIA.",
    browseCatalogSchema.shape,
    async (params) => {
      try {
        const catalog = await browseCatalogByFaculty(
          params.level,
          params.faculty,
          params.program
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(catalog, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error navegando catálogo: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get-course-details",
    "Obtener detalles completos de una asignatura: descripción, prerrequisitos, facultad, departamento.",
    courseDetailsSchema.shape,
    async (params) => {
      try {
        const details = await getFullCourseDetails(params.courseCode);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(details, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error obteniendo detalles: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // === AUTHENTICATED TOOLS ===

  server.tool(
    "authenticate",
    "Iniciar sesión en el SIA con credenciales institucionales UN. Necesario antes de usar tools que requieren autenticación.",
    authenticateSchema.shape,
    async (params) => {
      try {
        const session = await authenticate(params.username, params.password);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  authenticated: session.isAuthenticated,
                  username: session.username,
                  expiresAt: session.expiresAt?.toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error de autenticación: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get-grades",
    "Obtener notas del estudiante. Requiere autenticación previa. Opcionalmente filtrar por período (ej: 2024-1S).",
    gradesSchema.shape,
    async (params) => {
      try {
        const state = getSessionState();
        if (!state.isAuthenticated) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No hay sesión activa. Usa el tool 'authenticate' primero con tus credenciales UN.",
              },
            ],
            isError: true,
          };
        }

        const grades = await getGrades(params.period);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(grades, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error obteniendo notas: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get-current-schedule",
    "Obtener el horario actual del estudiante. Requiere autenticación previa.",
    {},
    async () => {
      try {
        const state = getSessionState();
        if (!state.isAuthenticated) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No hay sesión activa. Usa el tool 'authenticate' primero con tus credenciales UN.",
              },
            ],
            isError: true,
          };
        }

        const schedule = await getCurrentSchedule();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(schedule, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error obteniendo horario: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get-academic-history",
    "Obtener historial académico completo con PAPA, créditos y notas por período. Requiere autenticación previa.",
    {},
    async () => {
      try {
        const state = getSessionState();
        if (!state.isAuthenticated) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No hay sesión activa. Usa el tool 'authenticate' primero con tus credenciales UN.",
              },
            ],
            isError: true,
          };
        }

        const history = await getAcademicHistory();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(history, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error obteniendo historial: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get-enrollment-status",
    "Obtener estado de matrícula actual: asignaturas inscritas, créditos y estado. Requiere autenticación previa.",
    {},
    async () => {
      try {
        const state = getSessionState();
        if (!state.isAuthenticated) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No hay sesión activa. Usa el tool 'authenticate' primero con tus credenciales UN.",
              },
            ],
            isError: true,
          };
        }

        const enrollment = await getEnrollmentStatus();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(enrollment, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error obteniendo estado de matrícula: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
