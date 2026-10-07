// web/src/lib/entityUtils.ts
import type { UIEntity } from "../types";
import { generateKey } from "./generateKey";

/**
 * Вычисляет уникальный ID для копии сущности.
 * Формат: <base>Copy, <base>Copy2, <base>Copy3, ...
 */
export function computeNextCopyId(base: string, taken: string[]): string {
  if (!taken.includes(`${base}Copy`)) return `${base}Copy`;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}Copy${i}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${base}Copy_${Date.now()}`;
}

/**
 * Создаёт копию сущности с новым ID.
 */
export function cloneEntity(original: UIEntity, takenIds: string[]): UIEntity {
  return {
    id: computeNextCopyId(original.id, takenIds),
    name: original.name ? `${original.name} (копия)` : "",
    label: original.label,
    description: original.description,
    inherits: original.inherits,
    attributes: original.attributes.map((a) => ({
      ...a,
      _key: generateKey(),
    })),
    // Флаги копируются как есть
    generateList: original.generateList,
    generateModals: original.generateModals,
    generatePanel: original.generatePanel,
    generatePage: original.generatePage,
    generateSorting: original.generateSorting,
    generateSearching: original.generateSearching,
    generateLinkages: original.generateLinkages,
  };
}

export function generateEntityId(taken: string[]): string {
  let counter = 1;
  for (;;) {
    const candidate = `Entity${counter}`;
    if (!taken.includes(candidate)) return candidate;
    counter++;
  }
}
