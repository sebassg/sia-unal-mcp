import { z } from "zod";

export const searchCoursesSchema = z.object({
  level: z.enum(["Pregrado", "Posgrado"]).default("Pregrado").describe("Nivel académico"),
  faculty: z.string().min(1).describe("Facultad exacta (obtener con list-faculties)"),
  program: z.string().min(1).describe("Plan de estudios exacto (obtener con list-programs)"),
  typology: z
    .enum([
      "disciplinar_optativa",
      "fundamentacion_obligatoria",
      "disciplinar_obligatoria",
      "libre_eleccion",
      "nivelacion",
      "trabajo_de_grado",
      "fundamentacion_optativa",
    ])
    .optional()
    .describe("Tipología de la asignatura (opcional)"),
  name: z.string().optional().describe("Nombre o fragmento del nombre de la asignatura"),
  credits: z.number().int().optional().describe("Número de créditos"),
  days: z
    .array(z.enum(["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]))
    .optional()
    .describe("Días de la semana"),
  sede: z.string().optional().describe("Sede (usar label exacto de list-faculties)"),
});

export const listFacultiesSchema = z.object({
  level: z.enum(["Pregrado", "Posgrado"]).default("Pregrado").describe("Nivel académico"),
  sede: z.string().optional().describe("Sede (ej: 'Medellín'). Si no se especifica, usa la sede configurada en el servidor."),
});

export const listProgramsSchema = z.object({
  level: z.enum(["Pregrado", "Posgrado"]).default("Pregrado").describe("Nivel académico"),
  faculty: z.string().min(1).describe("Facultad exacta obtenida con list-faculties"),
  sede: z.string().optional().describe("Sede (ej: 'Medellín'). Si no se especifica, usa la sede configurada en el servidor."),
});

export const courseGroupsSchema = z.object({
  courseCode: z
    .string()
    .min(1)
    .describe("Código numérico de la asignatura (ej: 3007747)"),
});

export const courseDetailsSchema = z.object({
  courseCode: z.string().min(1).describe("Código de la asignatura"),
  level: z.enum(["Pregrado", "Posgrado"]).default("Pregrado").describe("Nivel académico"),
  faculty: z.string().min(1).describe("Facultad exacta (obtener con list-faculties)"),
  program: z.string().min(1).describe("Plan de estudios exacto (obtener con list-programs)"),
  sede: z.string().optional().describe("Sede (ej: 'Medellín'). Si no se especifica, usa la sede configurada en el servidor."),
});

export const seatAvailabilitySchema = z.object({
  courseCode: z
    .string()
    .min(1)
    .describe("Código numérico de la asignatura"),
});

export const authenticateSchema = z.object({
  username: z
    .string()
    .min(1)
    .describe("Usuario institucional UN (sin @unal.edu.co)"),
  password: z.string().min(1).describe("Contraseña institucional"),
});

export const gradesSchema = z.object({
  period: z
    .string()
    .optional()
    .describe("Período académico (ej: 2024-1S). Si no se especifica, retorna todos"),
});

export const scheduleSchema = z.object({});

export const academicHistorySchema = z.object({});

export const enrollmentStatusSchema = z.object({});
