import { chromium, type Browser, type Page } from "playwright";
import { URLS, ADF_SELECTORS, PLAYWRIGHT_HEADLESS, getSede } from "../config/constants.js";
import { globalRateLimiter } from "../utils/rate-limiter.js";
import { parseAdfTable, type TableRow } from "../parsers/adf-table-parser.js";
import type { DropdownOption } from "../types/sia.js";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: PLAYWRIGHT_HEADLESS });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/** Normalize a string for fuzzy matching: lowercase + strip NFD diacritics */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Wait for an ADF select dropdown to be populated with at least minOptions options.
 * More reliable than networkidle because it directly checks the DOM condition.
 */
async function waitForDropdownPopulated(
  page: Page,
  selector: string,
  minOptions = 2,
  timeoutMs = 8000
): Promise<void> {
  await page
    .waitForFunction(
      ({ sel, min }: { sel: string; min: number }) =>
        (document.querySelectorAll(`${sel} option`) as NodeListOf<HTMLOptionElement>).length >= min,
      { sel: selector, min: minOptions },
      { timeout: timeoutMs }
    )
    .catch(() => {
      // If it times out, continue anyway — readDropdownOptions will return whatever is there
    });
}

/**
 * Wait for an ADF select to become enabled (not disabled).
 * Needed for dropdowns like Sede that are pre-loaded with options but kept disabled
 * until a parent dropdown cascade fires — waitForDropdownPopulated won't work there
 * because the option count condition is already satisfied from page load.
 */
async function waitForSelectEnabled(
  page: Page,
  selector: string,
  timeoutMs = 10000
): Promise<void> {
  await page
    .waitForFunction(
      (sel: string) => !(document.querySelector(sel) as HTMLSelectElement | null)?.disabled,
      selector,
      { timeout: timeoutMs }
    )
    .catch(() => {});
}

/**
 * Trigger Oracle ADF's cascade PPR for a select element after its value has been changed.
 *
 * page.selectOption() fires the DOM change event and ADF's onchange handler runs, but in
 * Playwright headless mode AdfPage._sendRichPayload is never reached (the internal ADF event
 * queue is not initialised without a real display). Calling _sendRichPayload directly bypasses
 * the broken event-queue path and fires the actual PPR POST to the server.
 *
 * The first POST is blocked by the SIA WAF (403) because ADF serialises internal JS objects
 * into the request body. When addPartialTargets() is called beforehand, ADF automatically
 * retries with a clean body that the WAF allows through (200), which updates the DOM.
 */
async function adfTrigger(page: Page, selector: string): Promise<void> {
  // All cascade-dependent dropdowns in the catalog form.
  // Adding them as partial targets causes ADF to retry (clean body, no JS) after the WAF-403.
  const CATALOG_CASCADE_IDS = [
    "pt1:r1:0:soc9", // Sede
    "pt1:r1:0:soc2", // Facultad
    "pt1:r1:0:soc3", // Plan de estudios
    "pt1:r1:0:soc4", // Tipología
  ];

  await page.evaluate(
    ({ sel, cascadeIds }: { sel: string; cascadeIds: string[] }) => {
      const select = document.querySelector(sel) as HTMLSelectElement | null;
      if (!select?.name) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adfPage = (window as any).AdfPage?.PAGE;
      const comp = adfPage?.findComponent(select.name);
      if (!comp || typeof adfPage?._sendRichPayload !== "function") return;

      for (const id of cascadeIds) {
        const c = adfPage.findComponent(id);
        if (c && c !== comp) adfPage.addPartialTargets(c);
      }
      adfPage._sendRichPayload(comp, null, null);
    },
    { sel: selector, cascadeIds: CATALOG_CASCADE_IDS }
  );
}

/**
 * Wait for ADF cascade XHR to settle after a dropdown selection.
 * Uses networkidle with a short timeout; falls through silently if it takes too long.
 */
async function waitForAdfCascade(page: Page, timeoutMs = 4000): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});
}

/**
 * Fires an action (dropdown selection) and simultaneously waits for the ADF PPR response.
 * Using Promise.all avoids the race condition where the PPR fires before we start listening.
 * Silently continues if no PPR arrives (e.g. first selection without a cascade dependency).
 */
async function selectAndWaitPpr(
  page: Page,
  action: () => Promise<void>,
  timeoutMs = 10000
): Promise<void> {
  await Promise.all([
    page
      .waitForResponse(
        (resp) =>
          resp.url().includes("servicioPublico.jsf") &&
          resp.request().method() === "POST" &&
          resp.status() === 200,
        { timeout: timeoutMs }
      )
      .catch(() => {}),
    action(),
  ]);
}

/** Navigate to the catalog search page and wait for the level selector to appear */
async function navigateToCatalog(page: Page): Promise<void> {
  // "load" waits for all scripts (ADF registers its cascade handlers on load, not DOMContentLoaded)
  await page.goto(URLS.catalogSearch(), { waitUntil: "load", timeout: 45000 });
  await page.waitForSelector(ADF_SELECTORS.catalog.level, { timeout: 10000 });
}

/** Read all non-empty options from an ADF select dropdown */
async function readDropdownOptions(page: Page, selector: string): Promise<DropdownOption[]> {
  return page.$$eval(`${selector} option`, (opts) =>
    (opts as HTMLOptionElement[])
      .filter((o) => o.value && o.value.trim() !== "")
      .map((o) => ({ value: o.value, label: o.textContent?.trim() ?? o.value }))
  );
}

/**
 * Select a dropdown option by fuzzy label matching with NFD normalization.
 * "medellin" matches "1102 SEDE MEDELLÍN", "minas" matches "3068 FACULTAD DE MINAS", etc.
 */
async function selectDropdownByLabel(
  page: Page,
  selector: string,
  label: string
): Promise<void> {
  const options = await page.$$eval(`${selector} option`, (opts) =>
    opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: o.textContent?.trim() ?? "" }))
  );

  const normalizedLabel = normalize(label);
  const match = options.find((o) => normalize(o.text).includes(normalizedLabel));

  if (match) {
    await page.selectOption(selector, match.value);
    await adfTrigger(page, selector);
  } else {
    throw new Error(
      `Option "${label}" not found. Available: ${options.map((o) => o.text).join(", ")}`
    );
  }
}

/**
 * Select a dropdown option by value or fuzzy label, with NFD normalization fallback.
 */
async function selectDropdownOption(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  let selected = false;
  await page.selectOption(selector, { label: value }).then(async () => {
    selected = true;
    await adfTrigger(page, selector);
  }).catch(() => {});
  if (!selected) {
    await selectDropdownByLabel(page, selector, value).catch(() => {});
  }
}

/**
 * Select the configured default sede from environment.
 * getSede() returns e.g. "medellin" which matches "1102 SEDE MEDELLÍN" via NFD normalization.
 */
async function selectDefaultSede(page: Page): Promise<void> {
  await selectDropdownByLabel(page, ADF_SELECTORS.catalog.sede, getSede()).catch(() => {});
  await waitForDropdownPopulated(page, ADF_SELECTORS.catalog.faculty);
}

/**
 * Select the sede from a user-provided label (or fall back to env default).
 * Accepts values like "Medellín", "medellin", "MEDELLIN", "1102 SEDE MEDELLÍN", etc.
 */
async function selectSede(page: Page, sede: string | undefined): Promise<void> {
  const label = sede || getSede();
  await selectDropdownByLabel(page, ADF_SELECTORS.catalog.sede, label).catch(() => {});
  await waitForDropdownPopulated(page, ADF_SELECTORS.catalog.faculty);
}

/**
 * Returns the list of faculties available for the given level (and optional sede).
 */
export async function getFacultyOptions(
  level: string,
  sede?: string
): Promise<DropdownOption[]> {
  await globalRateLimiter.wait();

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await navigateToCatalog(page);

    // Level → PPR updates sede options
    await selectAndWaitPpr(page, () =>
      selectDropdownOption(page, ADF_SELECTORS.catalog.level, level)
    );
    await waitForSelectEnabled(page, ADF_SELECTORS.catalog.sede);

    // Sede → PPR updates faculty options (selectSede also waits for faculty internally)
    await selectAndWaitPpr(page, () => selectSede(page, sede));

    return await readDropdownOptions(page, ADF_SELECTORS.catalog.faculty);
  } finally {
    await page.close();
  }
}

/**
 * Returns the list of programs (planes de estudios) for the given level, faculty, and optional sede.
 */
export async function getProgramOptions(
  level: string,
  faculty: string,
  sede?: string
): Promise<DropdownOption[]> {
  await globalRateLimiter.wait();

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await navigateToCatalog(page);

    // Level → PPR updates sede
    await selectAndWaitPpr(page, () =>
      selectDropdownOption(page, ADF_SELECTORS.catalog.level, level)
    );
    await waitForSelectEnabled(page, ADF_SELECTORS.catalog.sede);

    // Sede → PPR updates faculty
    await selectAndWaitPpr(page, () => selectSede(page, sede));
    await waitForDropdownPopulated(page, ADF_SELECTORS.catalog.faculty, 2, 8000);

    // Faculty → PPR updates program
    await selectAndWaitPpr(page, () =>
      selectDropdownByLabel(page, ADF_SELECTORS.catalog.faculty, faculty)
    );
    await waitForDropdownPopulated(page, ADF_SELECTORS.catalog.program);

    return await readDropdownOptions(page, ADF_SELECTORS.catalog.program);
  } finally {
    await page.close();
  }
}

export interface SearchCatalogParams {
  level: string;
  faculty: string;
  program: string;
  typology?: string;
  name?: string;
  credits?: number;
  days?: string[];
  sede?: string;
}

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

/**
 * Performs a full catalog search using the required faculty and program dropdowns.
 */
export async function searchCatalog(params: SearchCatalogParams): Promise<TableRow[]> {
  await globalRateLimiter.wait();

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await navigateToCatalog(page);

    const sel = ADF_SELECTORS.catalog;

    // 1. Level → PPR updates sede
    await selectAndWaitPpr(page, () => selectDropdownOption(page, sel.level, params.level));
    await waitForSelectEnabled(page, sel.sede);

    // 2. Sede → PPR updates faculty (selectSede also waits for faculty internally)
    await selectAndWaitPpr(page, () => selectSede(page, params.sede));
    await waitForDropdownPopulated(page, sel.faculty, 2, 8000);

    // 3. Faculty → PPR updates program
    await selectAndWaitPpr(page, () => selectDropdownByLabel(page, sel.faculty, params.faculty));
    await waitForDropdownPopulated(page, sel.program, 2, 8000);

    // 4. Program (no cascade expected — short networkidle to stabilise)
    await selectDropdownByLabel(page, sel.program, params.program);
    await waitForAdfCascade(page, 3000);

    // 5. Typology (optional)
    if (params.typology) {
      const typologyLabel = TYPOLOGY_LABELS[params.typology] ?? params.typology;
      await page.selectOption(sel.typology, { label: typologyLabel }).catch(() => {});
    }

    // 6. Name filter (optional)
    if (params.name) {
      const nameInput =
        (await page.$(sel.nameInput)) ?? (await page.$('input[id*="it1"]'));
      if (nameInput) {
        await nameInput.fill(params.name);
      }
    }

    // 7. Credits filter (optional) — selector may not exist; ignore silently
    if (params.credits !== undefined) {
      const creditsInput =
        (await page.$(sel.creditsInput)) ?? (await page.$('input[id*="it2"]'));
      if (creditsInput) {
        await creditsInput.fill(String(params.credits));
      }
    }

    // 8. Days filter — TODO: ADF selectors unknown, skip silently

    // 9. Execute search and wait for results
    await page.click(sel.searchButton);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    const tableHtml = await page.evaluate((tableSelector) => {
      const table = document.querySelector(tableSelector);
      return table ? table.outerHTML : "";
    }, sel.resultsTable);

    if (!tableHtml) return [];
    return parseAdfTable(tableHtml);
  } finally {
    await page.close();
  }
}

export interface CourseBrowserParams {
  courseCode: string;
  level: string;
  faculty: string;
  program: string;
  sede?: string;
}

/**
 * Navigate to a specific course's detail page in the catalog and return its full HTML.
 * Requires level, faculty, and program to navigate the cascading form first.
 */
export async function getCourseDetailHtml(params: CourseBrowserParams): Promise<string> {
  await globalRateLimiter.wait();

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await navigateToCatalog(page);

    const sel = ADF_SELECTORS.catalog;

    // 1. Level → PPR updates sede
    await selectAndWaitPpr(page, () => selectDropdownOption(page, sel.level, params.level));
    await waitForSelectEnabled(page, sel.sede);

    // 2. Sede → PPR updates faculty
    await selectAndWaitPpr(page, () => selectSede(page, params.sede));
    await waitForDropdownPopulated(page, sel.faculty, 2, 8000);

    // 3. Faculty → PPR updates program
    await selectAndWaitPpr(page, () => selectDropdownByLabel(page, sel.faculty, params.faculty));
    await waitForDropdownPopulated(page, sel.program, 2, 8000);

    // 4. Program
    await selectDropdownByLabel(page, sel.program, params.program);
    await waitForAdfCascade(page, 3000);

    // 5. Search to get results
    await page.click(sel.searchButton);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    // 6. Find and click the course link in the results table
    // Course codes appear as text in the first column; clicking navigates to the detail page.
    // Normalize the code for matching (remove whitespace)
    const code = params.courseCode.trim();
    const clicked = await page.evaluate((targetCode) => {
      const cells = Array.from(document.querySelectorAll("td"));
      for (const cell of cells) {
        if (cell.textContent?.trim() === targetCode) {
          // Try clicking a link inside the cell first, then the cell itself
          const link = cell.querySelector("a");
          if (link) {
            (link as HTMLElement).click();
          } else {
            cell.click();
          }
          return true;
        }
      }
      return false;
    }, code);

    if (!clicked) {
      return "";
    }

    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    return await page.content();
  } finally {
    await page.close();
  }
}
