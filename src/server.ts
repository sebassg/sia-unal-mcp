import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchCoursesSchema,
  listFacultiesSchema,
  listProgramsSchema,
  courseGroupsSchema,
  courseDetailsSchema,
  seatAvailabilitySchema,
  authenticateSchema,
  gradesSchema,
} from "./config/schemas.js";
import { searchCourses } from "./scrapers/course-search.js";
import { getCourseGroups, checkSeatAvailability } from "./scrapers/course-groups.js";
import { getFullCourseDetails, listFaculties, listPrograms } from "./scrapers/catalog-browse.js";
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

  server.registerTool(
    "list-faculties",
    {
      description: "Listar las facultades disponibles en el catálogo del SIA UNAL para un nivel académico. Usar antes de search-courses para obtener el valor exacto del parámetro 'faculty'.",
      inputSchema: listFacultiesSchema.shape as any,
    },
    async (params: z.infer<typeof listFacultiesSchema>) => {
      try {
        const options = await listFaculties(params.level, params.sede);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(options, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listando facultades: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list-programs",
    {
      description: "Listar los planes de estudio disponibles para una facultad específica. Usar antes de search-courses para obtener el valor exacto del parámetro 'program'.",
      inputSchema: listProgramsSchema.shape as any,
    },
    async (params: z.infer<typeof listProgramsSchema>) => {
      try {
        const options = await listPrograms(params.level, params.faculty, params.sede);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(options, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listando programas: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "search-courses",
    {
      description: "Buscar asignaturas en el catálogo público del SIA UNAL. Requiere faculty y program exactos (obtenerlos con list-faculties y list-programs). Retorna nombre, código, créditos y tipología.",
      inputSchema: searchCoursesSchema.shape as any,
    },
    async (params: z.infer<typeof searchCoursesSchema>) => {
      try {
        const result = await searchCourses({
          level: params.level,
          faculty: params.faculty,
          program: params.program,
          typology: params.typology,
          name: params.name,
          credits: params.credits,
          days: params.days,
          sede: params.sede,
        });
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

  server.registerTool(
    "get-course-groups",
    {
      description: "Obtener los grupos, horarios, docentes y aulas de una asignatura específica por su código.",
      inputSchema: courseGroupsSchema.shape as any,
    },
    async (params: z.infer<typeof courseGroupsSchema>) => {
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

  server.registerTool(
    "check-seat-availability",
    {
      description: "Consultar cupos disponibles en tiempo real para una asignatura. Muestra cupos totales y disponibles por grupo.",
      inputSchema: seatAvailabilitySchema.shape as any,
    },
    async (params: z.infer<typeof seatAvailabilitySchema>) => {
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

  server.registerTool(
    "get-course-details",
    {
      description: "Obtener detalles completos de una asignatura: descripción, prerrequisitos, facultad, departamento. Requiere faculty y program exactos (obtenerlos con list-faculties y list-programs).",
      inputSchema: courseDetailsSchema.shape as any,
    },
    async (params: z.infer<typeof courseDetailsSchema>) => {
      try {
        const details = await getFullCourseDetails({
          courseCode: params.courseCode,
          level: params.level,
          faculty: params.faculty,
          program: params.program,
          sede: params.sede,
        });
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

  server.registerTool(
    "authenticate",
    {
      description: "Iniciar sesión en el SIA con credenciales institucionales UN. Necesario antes de usar tools que requieren autenticación.",
      inputSchema: authenticateSchema.shape as any,
    },
    async (params: z.infer<typeof authenticateSchema>) => {
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

  server.registerTool(
    "get-grades",
    {
      description: "Obtener notas del estudiante. Requiere autenticación previa. Opcionalmente filtrar por período (ej: 2024-1S).",
      inputSchema: gradesSchema.shape as any,
    },
    async (params: z.infer<typeof gradesSchema>) => {
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

  server.registerTool(
    "get-current-schedule",
    {
      description: "Obtener el horario actual del estudiante. Requiere autenticación previa.",
    },
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

  server.registerTool(
    "get-academic-history",
    {
      description: "Obtener historial académico completo con PAPA, créditos y notas por período. Requiere autenticación previa.",
    },
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

  server.registerTool(
    "get-enrollment-status",
    {
      description: "Obtener estado de matrícula actual: asignaturas inscritas, créditos y estado. Requiere autenticación previa.",
    },
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
