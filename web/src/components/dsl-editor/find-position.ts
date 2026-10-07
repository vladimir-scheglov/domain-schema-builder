// web/src/components/dsl-editor/find-position.ts
import type { ElementDiff } from "./schema-diff";

/**
 * Ищет позицию элемента в тексте DSL.
 * Возвращает offset или null.
 */
export function findDslPosition(
  d: ElementDiff,
  dslText: string,
): number | null {
  const { kind, id, parentId } = d;

  // Сущность: "  Ioc:" в блоке entities
  if (kind === "entity") {
    const re = new RegExp(`^\\s{2}${escapeRegex(id)}:\\s*$`, "m");
    const m = re.exec(dslText);
    return m ? m.index : null;
  }

  // Атрибут сущности: "    attrId:" внутри блока сущности
  if (kind === "attribute" && parentId) {
    // Ищем блок сущности
    const entityRe = new RegExp(`^\\s{2}${escapeRegex(parentId)}:\\s*$`, "m");
    const entityMatch = entityRe.exec(dslText);
    if (!entityMatch) return null;

    // Ищем атрибут ниже в этом блоке (до следующей сущности того же уровня)
    const blockStart = entityMatch.index + entityMatch[0].length;
    const rest = dslText.slice(blockStart);
    const attrRe = new RegExp(`^\\s{4}${escapeRegex(id)}:`, "m");
    const attrMatch = attrRe.exec(rest);
    if (!attrMatch) return null;
    return blockStart + attrMatch.index;
  }

  // Enum / workflow: "  IocType:" в блоке enums или workflows
  if (kind === "enum") {
    const re = new RegExp(`^\\s{2}${escapeRegex(id)}:`, "m");
    const m = re.exec(dslText);
    if (m) return m.index;
    // Может быть в краткой форме: "IocType: [IP, Domain]"
    const alt = new RegExp(`^${escapeRegex(id)}:`, "m");
    const altM = alt.exec(dslText);
    return altM ? altM.index : null;
  }

  if (kind === "workflow") {
    const re = new RegExp(`^\\s{2}${escapeRegex(id)}:`, "m");
    const m = re.exec(dslText);
    return m ? m.index : null;
  }

  // Связь
  if (kind === "linkage") {
    // Связь задаётся как "  Ioc:\n    - n:n Incident" или через ID.
    // Ищем ID как имя стороны — но проще искать по подстроке
    const re = new RegExp(`\\b${escapeRegex(id)}\\b`);
    const m = re.exec(dslText);
    return m ? m.index : null;
  }

  // Дерево
  if (kind === "tree") {
    const re = new RegExp(`^\\s*${escapeRegex(id)}:`, "m");
    const m = re.exec(dslText);
    return m ? m.index : null;
  }

  // Fallback: поиск по ID как слово
  const fallback = new RegExp(`\\b${escapeRegex(id)}\\b`);
  const m = fallback.exec(dslText);
  return m ? m.index : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
