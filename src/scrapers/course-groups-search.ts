import { searchCatalog } from "../clients/catalog-browser.js";
import { globalCache } from "../cache/cache-manager.js";
import { getCourseGroups } from "./course-groups.js";
import { rowToCourse } from "./course-search.js";
import type { Course } from "../types/sia.js";
import type { SearchCoursesParams } from "./course-search.js";

async function pLimit<T>(concurrency: number, tasks: Array<() => Promise<T>>): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function searchCourseGroups(params: SearchCoursesParams): Promise<Course[]> {
  const cacheKey = `groupsearch:${params.level}:${params.faculty}:${params.program}:${params.typology ?? ""}:${params.name ?? ""}:${params.credits ?? ""}:${(params.days ?? []).join(",")}:${params.sede ?? ""}`;
  const cached = globalCache.get<Course[]>(cacheKey);
  if (cached) return cached;

  const rows = await searchCatalog(params);
  const courses = rows.map(rowToCourse);

  const groupResults = await pLimit(3, courses.map((c) => () => getCourseGroups(c.code)));

  const result = courses.map((c, i) => ({ ...c, groups: groupResults[i] }));

  globalCache.set(cacheKey, result);
  return result;
}
