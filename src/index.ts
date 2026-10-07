import { parseDsl } from "./dsl/parse";
import { validateIr } from "./ir/validate";
import { generateFromIr } from "./generators";

export function generateSchema(dslYaml: string): string {
  const ir = parseDsl(dslYaml);
  const result = validateIr(ir);
  if (!result.ok) {
    const msgs = result.issues
      .filter((i) => i.level === "error")
      .map((i) => `  [${i.code}] ${i.message}`)
      .join("\n");
    throw new Error(`Ошибки валидации:\n${msgs}`);
  }
  return generateFromIr(ir);
}

export { parseDsl } from "./dsl/parse";
export { generateFromIr } from "./generators";
export { validateIr } from "./ir/validate";
export * from "./ir/types";
