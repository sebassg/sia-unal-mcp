import type { CourseGroup, RawGroup } from "../types/sia.js";

export function parseRawGroup(raw: RawGroup): CourseGroup {
  return {
    code: raw.codigo,
    professorName: raw.nombredocente,
    professorUsername: raw.usuariodocente,
    totalSeats: raw.cupostotal,
    availableSeats: raw.cuposdisponibles,
    schedule: {
      monday: formatSchedule(raw.horario_lunes),
      tuesday: formatSchedule(raw.horario_martes),
      wednesday: formatSchedule(raw.horario_miercoles),
      thursday: formatSchedule(raw.horario_jueves),
      friday: formatSchedule(raw.horario_viernes),
      saturday: formatSchedule(raw.horario_sabado),
      sunday: formatSchedule(raw.horario_domingo),
    },
    classrooms: {
      monday: raw.aula_lunes || "--",
      tuesday: raw.aula_martes || "--",
      wednesday: raw.aula_miercoles || "--",
      thursday: raw.aula_jueves || "--",
      friday: raw.aula_viernes || "--",
      saturday: raw.aula_sabado || "--",
      sunday: raw.aula_domingo || "--",
    },
    planRestrictions: (raw.planlimitacion?.list ?? []).map((r) => ({
      plan: r.plan,
      type: r.tipo_limitacion,
    })),
  };
}

function formatSchedule(value: string): string {
  if (!value || value === "--") return "--";
  return value;
}

export function parseGroupList(rawGroups: RawGroup[]): CourseGroup[] {
  return rawGroups.map(parseRawGroup);
}
