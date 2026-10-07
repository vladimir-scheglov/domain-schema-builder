// web/src/lib/loadDsl.ts
import { parseDsl, validateIr } from "domain-schema-builder";
import { irToUi } from "./fromIr";
import type { UIState } from "../types";

export interface LoadResult {
  ok: boolean;
  state?: UIState;
  errors: Array<{ code: string; message: string; path?: string }>;
}

export function loadDslFromText(dsl: string): LoadResult {
  let ir: ReturnType<typeof parseDsl>;
  try {
    ir = parseDsl(dsl);
  } catch (e) {
    return {
      ok: false,
      errors: [
        {
          code: "PARSE_ERROR",
          message: e instanceof Error ? e.message : String(e),
        },
      ],
    };
  }

  const result = validateIr(ir);
  if (!result.ok) {
    return {
      ok: false,
      errors: result.issues.map((i) => ({
        code: i.code,
        message: i.message,
        path: i.path,
      })),
    };
  }

  return {
    ok: true,
    state: irToUi(ir),
    errors: result.issues.map((i) => ({
      code: i.code,
      message: i.message,
      path: i.path,
    })),
  };
}
