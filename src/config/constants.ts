// SIA UNAL URLs, selectors, and codes

const BASE_HOST = "sia.unal.edu.co";

export const DEFAULT_SEDE = "medellin";

export function getSede(): string {
  return process.env.SIA_SEDE || DEFAULT_SEDE;
}

export const URLS = {
  jsonRpc: () => `https://${BASE_HOST}/ServiciosApp/buscador/JSON-RPC`,
  catalog: () =>
    `https://${BASE_HOST}/Catalogo/facespublico/public/servicioPublico.jsf`,
  catalogSearch: () =>
    `https://${BASE_HOST}/Catalogo/facespublico/public/servicioPublico.jsf?taskflowId=task-flow-AC_CatalogoAsignaturas`,
  login: () => `https://autenticasia.unal.edu.co`,
  portal: () => `https://${BASE_HOST}/ServiciosApp/`,
  grades: () =>
    `https://${BASE_HOST}/ServiciosApp/Historico/facesprivado/private/servicioPrivado.jsf`,
  schedule: () =>
    `https://${BASE_HOST}/ServiciosApp/Horario/facesprivado/private/servicioPrivado.jsf`,
  enrollment: () =>
    `https://${BASE_HOST}/ServiciosApp/Matricula/facesprivado/private/servicioPrivado.jsf`,
  academicHistory: () =>
    `https://${BASE_HOST}/ServiciosApp/Historico/facesprivado/private/servicioPrivado.jsf`,
};

// JSON-RPC methods
export const JSON_RPC_METHODS = {
  searchCourses: "buscador.obtenerAsignaturas",
  getCourseGroups: "buscador.obtenerGruposAsignaturas",
};

// ADF Selectors for catalog page
export const ADF_SELECTORS = {
  catalog: {
    level: '#pt1\\:r1\\:0\\:soc1\\:\\:content',
    sede: '#pt1\\:r1\\:0\\:soc9\\:\\:content',
    faculty: '#pt1\\:r1\\:0\\:soc2\\:\\:content',
    program: '#pt1\\:r1\\:0\\:soc3\\:\\:content',
    typology: '#pt1\\:r1\\:0\\:soc4\\:\\:content',
    nameInput: '#pt1\\:r1\\:0\\:it1\\:\\:content',
    creditsInput: '#pt1\\:r1\\:0\\:it2\\:\\:content',
    // TODO: ADF selectors for day-of-week checkboxes are unknown; needs manual inspection with PLAYWRIGHT_HEADLESS=false
    daysSelectors: {} as Record<string, string>,
    searchButton: '#pt1\\:r1\\:0\\:cb1',
    resultsTable: '#pt1\\:r1\\:0\\:t1',
    resultsTableBody: '#pt1\\:r1\\:0\\:t1\\:\\:db',
  },
  login: {
    usernameInput: '#username',
    passwordInput: '#password',
    submitButton: '#kc-login',
  },
  grades: {
    periodSelect: '#pt1\\:r1\\:0\\:soc1\\:\\:content',
    gradesTable: '#pt1\\:r1\\:0\\:t1',
    gradesTableBody: '#pt1\\:r1\\:0\\:t1\\:\\:db',
  },
  schedule: {
    scheduleTable: '#pt1\\:r1\\:0\\:t1',
  },
  academicHistory: {
    papaLabel: '#pt1\\:r1\\:0\\:ot1',
    historyTable: '#pt1\\:r1\\:0\\:t1',
  },
};

// Academic level codes
export const LEVELS: Record<string, string> = {
  pregrado: "pre",
  posgrado: "pos",
  all: "",
};

// Course typology codes
export const TYPOLOGIES: Record<string, string> = {
  disciplinar_optativa: "p",
  fundamentacion_obligatoria: "b",
  disciplinar_obligatoria: "c",
  libre_eleccion: "l",
  nivelacion: "m",
  trabajo_de_grado: "o",
  fundamentacion_optativa: "t",
  all: "",
};

// Sede label fragments for fuzzy matching against the ADF dropdown text (uses NFD normalization)
// Actual dropdown labels are like "1102 SEDE MEDELLÍN" — these substrings match after normalization
export const SEDE_CODES: Record<string, string> = {
  medellin: "MEDELLIN",
  bogota: "BOGOTA",
  manizales: "MANIZALES",
  palmira: "PALMIRA",
  amazonia: "AMAZONIA",
  caribe: "CARIBE",
  "de la paz": "DE LA PAZ",
  orinoquia: "ORINOQUIA",
  tumaco: "TUMACO",
};

// Rate limiting defaults
export const RATE_LIMIT_DELAY_MS = parseInt(
  process.env.RATE_LIMIT_DELAY || "2000",
  10
);
export const CACHE_TTL_MS = parseInt(
  process.env.CACHE_TTL || "300000",
  10
);
export const PLAYWRIGHT_HEADLESS =
  process.env.PLAYWRIGHT_HEADLESS !== "false";
