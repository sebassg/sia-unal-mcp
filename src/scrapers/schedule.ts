import { URLS, ADF_SELECTORS } from "../config/constants.js";
import { fetchAuthenticatedTable } from "../clients/authenticated-client.js";
import { parseScheduleRows } from "../parsers/schedule-parser.js";
import type { ScheduleEntry } from "../types/sia.js";

export async function getCurrentSchedule(): Promise<ScheduleEntry[]> {
  const rows = await fetchAuthenticatedTable(
    URLS.schedule(),
    ADF_SELECTORS.schedule.scheduleTable
  );

  return parseScheduleRows(rows);
}
