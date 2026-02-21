import { getCourseDetailHtml, getFacultyOptions, getProgramOptions } from "../clients/catalog-browser.js";
import { parseCourseDetailPage } from "../parsers/course-detail-parser.js";
import { globalCache } from "../cache/cache-manager.js";
import type { CourseDetails, DropdownOption } from "../types/sia.js";

export interface GetCourseDetailsParams {
  courseCode: string;
  level: string;
  faculty: string;
  program: string;
  sede?: string;
}

export async function getFullCourseDetails(
  params: GetCourseDetailsParams
): Promise<CourseDetails> {
  const { courseCode, level, faculty, program, sede } = params;
  const cacheKey = `details:${courseCode}:${level}:${faculty}:${program}:${sede ?? ""}`;
  const cached = globalCache.get<CourseDetails>(cacheKey);
  if (cached) return cached;

  const html = await getCourseDetailHtml({ courseCode, level, faculty, program, sede });

  const partial = html
    ? parseCourseDetailPage(html, courseCode)
    : {};

  const details: CourseDetails = {
    code: courseCode,
    name: partial.name || "",
    credits: partial.credits ?? 0,
    typology: partial.typology || "",
    faculty: partial.faculty || faculty,
    department: partial.department || "",
    program: partial.program || program,
    classCode: partial.classCode || "",
    prerequisites: partial.prerequisites || [],
    description: partial.description || "",
    groups: partial.groups || [],
  };

  globalCache.set(cacheKey, details);
  return details;
}

export async function listFaculties(
  level: string,
  sede?: string
): Promise<DropdownOption[]> {
  const cacheKey = `options:faculties:${level}:${sede ?? ""}`;
  const cached = globalCache.get<DropdownOption[]>(cacheKey);
  if (cached) return cached;

  const options = await getFacultyOptions(level, sede);

  globalCache.set(cacheKey, options);
  return options;
}

export async function listPrograms(
  level: string,
  faculty: string,
  sede?: string
): Promise<DropdownOption[]> {
  const cacheKey = `options:programs:${level}:${faculty}:${sede ?? ""}`;
  const cached = globalCache.get<DropdownOption[]>(cacheKey);
  if (cached) return cached;

  const options = await getProgramOptions(level, faculty, sede);

  globalCache.set(cacheKey, options);
  return options;
}
