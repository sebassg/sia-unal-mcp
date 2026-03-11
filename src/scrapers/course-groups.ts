import { getCourseGroupsHtml } from "../clients/catalog-browser.js";
import { parseCourseDetailPage } from "../parsers/course-detail-parser.js";
import { globalCache } from "../cache/cache-manager.js";
import type { CourseGroup, CatalogGroup, WeekSchedule, WeekClassrooms } from "../types/sia.js";

const DAY_MAP: Record<string, keyof WeekSchedule> = {
  lun: "monday", lunes: "monday",
  mar: "tuesday", martes: "tuesday",
  mie: "wednesday", mies: "wednesday", miercoles: "wednesday",
  jue: "thursday", jueves: "thursday",
  vie: "friday", viernes: "friday",
  sab: "saturday", sabado: "saturday",
  dom: "sunday", domingo: "sunday",
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function catalogGroupToCourseGroup(g: CatalogGroup): CourseGroup {
  const schedule: WeekSchedule = {
    monday: "", tuesday: "", wednesday: "", thursday: "",
    friday: "", saturday: "", sunday: "",
  };
  const classrooms: WeekClassrooms = {
    monday: "", tuesday: "", wednesday: "", thursday: "",
    friday: "", saturday: "", sunday: "",
  };

  for (const s of g.schedules) {
    const key = DAY_MAP[normalize(s.day)];
    if (key) {
      const timeStr = s.startTime && s.endTime ? `${s.startTime}-${s.endTime}` : s.startTime;
      schedule[key] = timeStr;
      classrooms[key] = s.classroom;
    }
  }

  return {
    code: g.groupNumber,
    professorName: g.professor,
    professorUsername: "",
    totalSeats: g.totalSeats,
    availableSeats: g.availableSeats,
    schedule,
    classrooms,
    planRestrictions: [],
  };
}

export async function getCourseGroups(courseCode: string): Promise<CourseGroup[]> {
  const cacheKey = `groups:${courseCode}`;
  const cached = globalCache.get<CourseGroup[]>(cacheKey);
  if (cached) return cached;

  const html = await getCourseGroupsHtml(courseCode);
  if (!html) return [];

  const detail = parseCourseDetailPage(html, courseCode);
  const groups = (detail.groups ?? []).map(catalogGroupToCourseGroup);

  globalCache.set(cacheKey, groups);
  return groups;
}

export async function checkSeatAvailability(
  courseCode: string
): Promise<{ courseCode: string; groups: Array<{ group: string; total: number; available: number; professor: string }> }> {
  // No cache — real-time seat data
  const html = await getCourseGroupsHtml(courseCode);
  if (!html) return { courseCode, groups: [] };

  const detail = parseCourseDetailPage(html, courseCode);
  const rawGroups: CatalogGroup[] = detail.groups ?? [];

  return {
    courseCode,
    groups: rawGroups.map((g) => ({
      group: g.groupNumber,
      total: g.totalSeats,
      available: g.availableSeats,
      professor: g.professor,
    })),
  };
}
