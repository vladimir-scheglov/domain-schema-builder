import { readFileSync, writeFileSync } from "fs";
import { generateSchema } from "../src/index";

const dsl = readFileSync("examples/iocs.dsl.yaml", "utf8");
const yaml = generateSchema(dsl);
writeFileSync("examples/iocs.schema.yaml", yaml);
console.log("✅ Схема сохранена в examples/iocs.schema.yaml");
console.log("---");
console.log(yaml);
