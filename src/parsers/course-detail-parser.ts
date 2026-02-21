import * as cheerio from "cheerio";
import type { CourseDetails, CatalogGroup, CatalogPrerequisite, CatalogSchedule } from "../types/sia.js";

/**
 * Parse a SIA UNAL Oracle ADF course detail page into a CourseDetails object.
 *
 * The detail page structure (from browser session documentation):
 * - Metadata: course name, code, credits, typology, faculty, department, program, period, classCode
 * - Prerequisites: table with columns [Condición, Tipo, ¿Todas?, Código, Asignatura]
 * - Groups: table/section with [Grupo, Profesor, Días, Horario, Aula, Cupos]
 *
 * Oracle ADF pages use consistent patterns: label text adjacent to value text,
 * and data in <table> elements with <thead>/<tbody>.
 */
export function parseCourseDetailPage(html: string, courseCode: string): Partial<CourseDetails> {
  const $ = cheerio.load(html);

  const result: Partial<CourseDetails> = {
    code: courseCode,
    prerequisites: [],
    groups: [],
    description: "",
  };

  // Extract the full page text for pattern-based extraction
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  // --- Metadata extraction ---
  // ADF label:value pairs typically appear as adjacent text nodes in table cells
  // Try multiple patterns for each field

  result.name = findLabelValue($, bodyText, [
    "Nombre de la asignatura",
    "Asignatura",
    "Nombre",
  ]);

  const creditsText = findLabelValue($, bodyText, ["Créditos", "Creditos"]);
  if (creditsText) {
    result.credits = parseInt(creditsText.replace(/\D/g, "")) || 0;
  }

  result.typology = findLabelValue($, bodyText, ["Tipología", "Tipologia"]) || "";
  result.faculty = findLabelValue($, bodyText, ["Facultad"]) || "";
  result.department = findLabelValue($, bodyText, ["Departamento"]) || "";
  result.program = findLabelValue($, bodyText, ["Plan de estudios"]) || "";
  result.classCode = findLabelValue($, bodyText, [
    "Código clase teórica",
    "Código clase",
    "Clase teórica",
  ]) || "";

  // If name not found via label, try the page header
  if (!result.name) {
    result.name =
      $("h1, h2").first().text().trim() ||
      findTextNearCode($, courseCode);
  }

  // --- Parse tables ---
  $("table").each((_, table) => {
    const $table = $(table);
    const headerTexts = $table
      .find("thead th, thead td, tr:first-child th")
      .map((_, el) => $(el).text().trim().toLowerCase())
      .get();

    // Prerequisites table: identified by "tipo" column and "código" column
    if (
      headerTexts.some((h) => h === "tipo" || h.includes("tipo")) &&
      headerTexts.some((h) => h.includes("digo") || h === "código") &&
      !result.prerequisites?.length
    ) {
      result.prerequisites = parsePrerequisiteTable($, table);
    }

    // Groups table: identified by "grupo" column header
    if (
      (headerTexts.some((h) => h === "grupo") ||
        headerTexts.some((h) => h.includes("grupo"))) &&
      !result.groups?.length
    ) {
      result.groups = parseGroupsTable($, table);
    }
  });

  // --- Fallback: extract groups from text if table parsing found nothing ---
  if (!result.groups?.length) {
    result.groups = extractGroupsFromText(bodyText);
  }

  return result;
}

/**
 * Find the value associated with a label in the page.
 * Tries:
 *  1. Adjacent <td> sibling (ADF form table pattern)
 *  2. Text immediately following the label in body text
 */
function findLabelValue(
  $: cheerio.CheerioAPI,
  bodyText: string,
  labels: string[]
): string | undefined {
  for (const label of labels) {
    // Strategy 1: look for a <td> or <span> whose text matches the label,
    // then grab the next sibling's text
    let found: string | undefined;

    $("td, th, span, label").each((_, el) => {
      if (found) return false; // stop iteration
      const text = $(el).text().trim();
      if (text.toLowerCase().replace(/:/g, "").trim() === label.toLowerCase()) {
        // Try next sibling
        const next = $(el).next();
        if (next.length) {
          const val = next.text().trim();
          if (val && val.length < 200) {
            found = val;
          }
        }
        // Try next <td> in same row
        if (!found) {
          const nextTd = $(el).closest("tr").find("td").eq($(el).closest("tr").find("td").index(el) + 1);
          if (nextTd.length) {
            const val = nextTd.text().trim();
            if (val && val.length < 200) {
              found = val;
            }
          }
        }
      }
    });

    if (found) return found;

    // Strategy 2: extract from body text using regex
    const pattern = new RegExp(
      `${escapeRegex(label)}\\s*:?\\s*([^\\n\\r|]{1,150})`,
      "i"
    );
    const match = bodyText.match(pattern);
    if (match) {
      const val = match[1].trim();
      if (val && val.length > 0 && val.length < 150) {
        return val;
      }
    }
  }
  return undefined;
}

/**
 * Find the course name by looking for text near the course code in the page.
 */
function findTextNearCode($: cheerio.CheerioAPI, courseCode: string): string {
  let result = "";
  $("td, span, h1, h2, h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes(courseCode)) {
      // Get the surrounding context
      const parts = text.split(courseCode);
      const after = parts[1]?.trim();
      if (after && after.length > 2 && after.length < 100) {
        result = after.split(/[\n\r|]/)[0].trim();
        return false;
      }
    }
  });
  return result;
}

/**
 * Parse the prerequisites table.
 * Expected columns (flexible): Condición, Tipo, ¿Todas?, Código, Asignatura
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePrerequisiteTable($: cheerio.CheerioAPI, table: any): CatalogPrerequisite[] {
  const $table = $(table);
  const headers: string[] = [];

  $table.find("thead th, thead td, tr:first-child th").each((_, el) => {
    headers.push($(el).text().trim().toLowerCase());
  });

  const prerequisites: CatalogPrerequisite[] = [];

  const dataRows =
    headers.length > 0
      ? $table.find("tbody tr")
      : $table.find("tr:not(:first-child)");

  dataRows.each((_, row) => {
    const cells: string[] = [];
    $(row)
      .find("td")
      .each((_, cell) => {
        cells.push($(cell).text().trim());
      });

    if (cells.length < 2) return;

    // Find column indices
    const tipoIdx = headers.findIndex((h) => h === "tipo");
    const codigoIdx = headers.findIndex(
      (h) => h.includes("digo") || h === "código" || h === "codigo"
    );
    const nombreIdx = headers.findIndex(
      (h) => h === "asignatura" || h.includes("nombre")
    );

    const type = cells[tipoIdx >= 0 ? tipoIdx : 1] || "";
    const code = cells[codigoIdx >= 0 ? codigoIdx : 3] || "";
    const name = cells[nombreIdx >= 0 ? nombreIdx : 4] || "";

    if (type || code) {
      prerequisites.push({ type, courseCode: code, courseName: name });
    }
  });

  return prerequisites;
}

/**
 * Parse the groups/schedules table.
 * Expected columns (flexible): Grupo, Profesor, Días, Horario, Aula, Cupos
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGroupsTable($: cheerio.CheerioAPI, table: any): CatalogGroup[] {
  const $table = $(table);
  const headers: string[] = [];

  $table.find("thead th, thead td, tr:first-child th").each((_, el) => {
    headers.push($(el).text().trim().toLowerCase());
  });

  const groups: CatalogGroup[] = [];

  const dataRows =
    headers.length > 0
      ? $table.find("tbody tr")
      : $table.find("tr:not(:first-child)");

  dataRows.each((_, row) => {
    const cells: string[] = [];
    $(row)
      .find("td")
      .each((_, cell) => {
        cells.push($(cell).text().trim());
      });

    if (cells.length < 2) return;

    const grupoIdx = Math.max(0, headers.findIndex((h) => h.includes("grupo")));
    const profesorIdx = Math.max(
      1,
      headers.findIndex((h) => h.includes("profesor") || h.includes("docente"))
    );
    const diasIdx = headers.findIndex((h) => h.includes("día") || h.includes("dia"));
    const horarioIdx = headers.findIndex(
      (h) => h.includes("horario") || h.includes("hora")
    );
    const aulaIdx = headers.findIndex(
      (h) => h.includes("aula") || h.includes("salon") || h.includes("salón")
    );
    const cuposIdx = headers.findIndex(
      (h) => h.includes("cupo") || h.includes("disponible")
    );

    const groupNumber = cells[grupoIdx] || "";
    const professor = cells[profesorIdx] || "";
    const availableSeats = parseInt(
      cells[cuposIdx >= 0 ? cuposIdx : cells.length - 1] || "0"
    );
    const aula = cells[aulaIdx >= 0 ? aulaIdx : -1] || "";
    const dias = cells[diasIdx >= 0 ? diasIdx : -1] || "";
    const horario = cells[horarioIdx >= 0 ? horarioIdx : -1] || "";

    if (!groupNumber && !professor) return;

    const schedules: CatalogSchedule[] = parseScheduleString(dias, horario, aula);

    groups.push({
      groupNumber,
      professor,
      schedules,
      availableSeats,
      totalSeats: 0, // not always available on detail page
    });
  });

  return groups;
}

/**
 * Parse schedule info from "Días" and "Horario" cell text.
 * Handles formats like "Mar / Jue", "10:00–12:00", "Mié / Vie | 08:00–10:00"
 */
function parseScheduleString(
  dias: string,
  horario: string,
  classroom: string
): CatalogSchedule[] {
  if (!dias && !horario) return [];

  const schedules: CatalogSchedule[] = [];

  // Normalize separators
  const dayParts = dias.split(/[/,|]/).map((d) => d.trim()).filter(Boolean);
  const timeParts = horario.match(/(\d{1,2}:\d{2})\s*[–\-—]\s*(\d{1,2}:\d{2})/g) || [];

  const firstTimePart = timeParts[0];
  if (dayParts.length > 0 && firstTimePart) {
    // One time range for all days (most common)
    const timeMatch = firstTimePart.match(/(\d{1,2}:\d{2})\s*[–\-—]\s*(\d{1,2}:\d{2})/);
    const startTime = timeMatch?.[1] || "";
    const endTime = timeMatch?.[2] || "";

    dayParts.forEach((day) => {
      schedules.push({ day, startTime, endTime, classroom });
    });
  } else if (dayParts.length > 0) {
    // No time info — still record the days
    dayParts.forEach((day) => {
      schedules.push({ day, startTime: "", endTime: "", classroom });
    });
  }

  return schedules;
}

/**
 * Fallback: extract groups from the page body text using regex patterns.
 * Used when table parsing fails (e.g., ADF renders groups as non-table elements).
 */
function extractGroupsFromText(bodyText: string): CatalogGroup[] {
  const groups: CatalogGroup[] = [];

  // Look for patterns like "Grupo N" followed by professor name and schedule
  // This is a best-effort fallback for complex ADF layouts
  const groupPattern = /Grupo\s+(\w+)[^\n]*?\n?([A-ZÁÉÍÓÚ][a-záéíóú\s]+)?\s*(\d{2}:\d{2})/g;
  let match: RegExpExecArray | null;

  while ((match = groupPattern.exec(bodyText)) !== null) {
    const groupNumber = match[1];
    const professor = match[2]?.trim() || "";
    if (groupNumber) {
      groups.push({
        groupNumber,
        professor,
        schedules: [],
        availableSeats: 0,
        totalSeats: 0,
      });
    }
  }

  return groups;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
