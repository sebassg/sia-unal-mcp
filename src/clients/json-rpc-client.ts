import { URLS, JSON_RPC_METHODS, LEVELS, TYPOLOGIES } from "../config/constants.js";
import { withRetry } from "../utils/retry.js";
import { globalRateLimiter } from "../utils/rate-limiter.js";
import type {
  JsonRpcResponse,
  RawSubjectResult,
  JavaList,
  RawGroup,
} from "../types/sia.js";

/**
 * SIA uses a non-standard JSON-RPC format where keys and method values are unquoted.
 * We must build the request body as a raw string, not JSON.stringify().
 */
export class JsonRpcClient {
  private url: string;

  constructor() {
    this.url = URLS.jsonRpc();
  }

  async searchCourses(
    query: string,
    level: string = "",
    typology: string = "",
    plan: string = "",
    page: number = 1,
    pageSize: number = 15
  ): Promise<JsonRpcResponse<RawSubjectResult>> {
    const levelCode = LEVELS[level] ?? level;
    const typologyCode = TYPOLOGIES[typology] ?? typology;

    // SIA's non-standard format: unquoted keys, unquoted method name
    // Level is passed at positions 1 and 3
    const body = `{ method: ${JSON_RPC_METHODS.searchCourses}, params: ['${this.escapeParam(query)}', '${levelCode}', '${typologyCode}', '${levelCode}', '${this.escapeParam(plan)}', '', ${page}, ${pageSize}] }`;

    return this.request<RawSubjectResult>(body);
  }

  async getCourseGroups(
    courseCode: string
  ): Promise<JsonRpcResponse<JavaList<RawGroup>>> {
    const code = parseInt(courseCode, 10);
    if (isNaN(code)) {
      throw new Error(`Invalid course code: ${courseCode}`);
    }

    const body = `{ method: ${JSON_RPC_METHODS.getCourseGroups}, params: [${code} , 0] }`;

    return this.request<JavaList<RawGroup>>(body);
  }

  private async request<T>(body: string): Promise<JsonRpcResponse<T>> {
    await globalRateLimiter.wait();

    return withRetry(async () => {
      const response = await fetch(this.url, {
        method: "POST",
        body,
        headers: {
          "Content-Type": "text/plain",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as JsonRpcResponse<T>;

      if (data.error) {
        throw new Error(`JSON-RPC error: ${data.error}`);
      }

      return data;
    });
  }

  private escapeParam(value: string): string {
    return value.replace(/'/g, "\\'");
  }
}
