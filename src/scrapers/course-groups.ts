import { JsonRpcClient } from "../clients/json-rpc-client.js";
import { parseGroupList } from "../parsers/group-parser.js";
import { globalCache } from "../cache/cache-manager.js";
import type { CourseGroup } from "../types/sia.js";

const client = new JsonRpcClient();

export async function getCourseGroups(
  courseCode: string
): Promise<CourseGroup[]> {
  const cacheKey = `groups:${courseCode}`;
  const cached = globalCache.get<CourseGroup[]>(cacheKey);
  if (cached) return cached;

  const response = await client.getCourseGroups(courseCode);
  const groups = parseGroupList(response.result?.list ?? []);

  globalCache.set(cacheKey, groups);
  return groups;
}

export async function checkSeatAvailability(
  courseCode: string
): Promise<{ courseCode: string; groups: Array<{ group: string; total: number; available: number; professor: string }> }> {
  // Don't cache seat availability - needs real-time data
  const response = await client.getCourseGroups(courseCode);
  const rawGroups = response.result?.list ?? [];

  return {
    courseCode,
    groups: rawGroups.map((g) => ({
      group: g.codigo,
      total: g.cupostotal,
      available: g.cuposdisponibles,
      professor: g.nombredocente,
    })),
  };
}
