import { searchCatalog } from "../clients/catalog-browser.js";
import { globalCache } from "../cache/cache-manager.js";
import type { SearchResult, Course } from "../types/sia.js";
import type { TableRow } from "../parsers/adf-table-parser.js";

export interface SearchCoursesParams {
  level: string;
  faculty: string;
  program: string;
  typology?: string;
  name?: string;
  credits?: number;
  days?: string[];
  sede?: string;
}

export async function searchCourses(params: SearchCoursesParams): Promise<SearchResult> {
  const cacheKey = `search:${params.level}:${params.faculty}:${params.program}:${params.typology ?? ""}:${params.name ?? ""}:${params.credits ?? ""}:${(params.days ?? []).join(",")}:${params.sede ?? ""}`;
  const cached = globalCache.get<SearchResult>(cacheKey);
  if (cached) return cached;

  const rows = await searchCatalog(params);
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
