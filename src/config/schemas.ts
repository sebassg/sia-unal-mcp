import { z } from "zod";

export const searchCoursesSchema = z.object({
  query: z.string().min(1).describe("Palabra clave para buscar asignaturas"),
  level: z
    .enum(["pregrado", "posgrado", "all"])
    .default("pregrado")
    .describe("Nivel académico"),
  typology: z
    .enum([
      "disciplinar_optativa",
      "fundamentacion_obligatoria",
      "disciplinar_obligatoria",
      "libre_eleccion",
      "nivelacion",
      "trabajo_de_grado",
      "fundamentacion_optativa",
      "all",
    ])
    .default("all")
    .describe("Tipología de la asignatura"),
  page: z.number().int().min(1).default(1).describe("Número de página"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(15)
    .describe("Resultados por página"),
});

export const courseGroupsSchema = z.object({
  courseCode: z
    .string()
    .min(1)
    .describe("Código numérico de la asignatura (ej: 3007747)"),
});

export const browseCatalogSchema = z.object({
  level: z
    .enum(["pregrado", "posgrado"])
    .default("pregrado")
    .describe("Nivel académico"),
  faculty: z.string().optional().describe("Nombre de la facultad"),
  program: z.string().optional().describe("Nombre del plan de estudios"),
});

export const courseDetailsSchema = z.object({
  courseCode: z
    .string()
    .min(1)
    .describe("Código de la asignatura"),
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
