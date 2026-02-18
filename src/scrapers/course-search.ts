import { searchByName } from "../clients/catalog-browser.js";
import { globalCache } from "../cache/cache-manager.js";
import type { SearchResult, Course } from "../types/sia.js";
import type { TableRow } from "../parsers/adf-table-parser.js";

// Maps typology enum keys to the human-readable labels used in the ADF dropdown
const TYPOLOGY_LABELS: Record<string, string> = {
  disciplinar_optativa: "Disciplinar Optativa",
  fundamentacion_obligatoria: "Fundamentación Obligatoria",
  disciplinar_obligatoria: "Disciplinar Obligatoria",
  libre_eleccion: "Libre Elección",
  nivelacion: "Nivelación",
  trabajo_de_grado: "Trabajo de Grado",
  fundamentacion_optativa: "Fundamentación Optativa",
};

export async function searchCourses(
  query: string,
  sede: string = "1102 SEDE MEDELLÍN",
  level: string = "Pregrado",
  typology: string = "all",
  page: number = 1,
  pageSize: number = 15
): Promise<SearchResult> {
  const cacheKey = `search:${query}:${level}:${typology}`;
  const cached = globalCache.get<SearchResult>(cacheKey);
  if (cached) return cached;

  // Map typology enum to human label for ADF dropdown (or empty for "all")
  const typologyLabel = typology !== "all" ? (TYPOLOGY_LABELS[typology] ?? "") : "";

  const rows = await searchByName(query, level, typologyLabel);
  const courses: Course[] = rows.map(rowToCourse);

  const result: SearchResult = {
    totalCourses: courses.length,
    totalPages: 1,
    courses,
  };

  globalCache.set(cacheKey, result);
  return result;
}

function rowToCourse(row: TableRow): Course {
  return {
    code: row["Código"] || row["col_0"] || "",
    name: row["Asignatura"] || row["col_1"] || "",
    credits: parseInt(row["Créditos"] || row["col_2"] || "0"),
    typology: row["Tipología"] || row["col_3"] || "",
  };
}
