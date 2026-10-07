#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, watch } from "node:fs";
import { resolve, dirname, basename, extname, join } from "node:path";
import { Command } from "commander";
import { generateSchema, parseDsl, validateIr } from "./index.js";
import { printDiff, hasColorSupport } from "./cli/diff.js";
import { simpleHash } from "./cli/hash.js";

const program = new Command();

program
  .name("dsb")
  .description(
    "Domain Schema Builder — генератор YAML-схем доменов из упрощённого DSL",
  )
  .version("0.1.0");

// ============================================================
// generate
// ============================================================
program
  .command("generate")
  .alias("gen")
  .description("Сгенерировать YAML-схему домена из DSL-файла")
  .argument("<input>", "путь к DSL-файлу (.dsl.yaml)")
  .option("-o, --out <path>", "путь для сохранения YAML-схемы")
  .option("-w, --watch", "следить за изменениями входного файла", false)
  .option("--stdout", "вывести YAML в stdout, не сохранять в файл", false)
  .option(
    "--diff",
    "показывать diff при перегенерации в watch-режиме (по умолчанию включено)",
    true,
  )
  .option("--no-diff", "отключить показ diff")
  .option("--quiet", "не выводить diff, только сообщения о сохранении", false)
  .option("--no-color", "отключить цветной вывод")
  .option("--context <n>", "сколько строк контекста вокруг изменений", "3")
  .action(
    (
      input: string,
      opts: {
        out?: string;
        watch?: boolean;
        stdout?: boolean;
        diff?: boolean;
        quiet?: boolean;
        color?: boolean;
        context?: string;
      },
    ) => {
      const inputPath = resolve(input);

      if (!existsSync(inputPath)) {
        console.error(`❌ Файл не найден: ${inputPath}`);
        process.exit(1);
      }

      const useColor = opts.color !== false && hasColorSupport();
      const context = Math.max(0, parseInt(opts.context ?? "3", 10) || 0);

      const outPath = opts.stdout
        ? null
        : opts.out
          ? resolve(opts.out)
          : join(
              dirname(inputPath),
              basename(inputPath, extname(inputPath)).replace(/\.dsl$/, "") +
                ".schema.yaml",
            );

      let previousYaml: string | null = null;
      let previousDslHash: string | null = null;

      const runOnce = (isFirst: boolean): void => {
        try {
          const dsl = readFileSync(inputPath, "utf8");

          // Пропускаем, если содержимое не изменилось (защита от лишних событий watch)
          const hash = simpleHash(dsl);
          if (!isFirst && hash === previousDslHash) {
            return;
          }
          previousDslHash = hash;

          const yaml = generateSchema(dsl);

          if (opts.stdout) {
            process.stdout.write(yaml);
            previousYaml = yaml;
            return;
          }

          const ts = new Date().toLocaleTimeString("ru-RU");

          // Diff с предыдущей версией — только если есть что показать
          if (
            !isFirst &&
            previousYaml !== null &&
            previousYaml !== yaml &&
            opts.diff !== false &&
            !opts.quiet
          ) {
            printDiff(previousYaml, yaml, { color: useColor, context });
          }

          writeFileSync(outPath!, yaml, "utf8");
          console.log(`✅ [${ts}] ${outPath}`);
          previousYaml = yaml;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`❌ Ошибка генерации:\n${msg}`);
          if (!opts.watch) process.exit(1);
        }
      };

      runOnce(true);

      if (opts.watch) {
        console.log(`👀 Следим за ${inputPath}... (Ctrl+C для выхода)`);
        let timer: NodeJS.Timeout | null = null;

        watch(inputPath, () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => runOnce(false), 100);
        });
      }
    },
  );

// ============================================================
// validate
// ============================================================
program
  .command("validate")
  .description("Проверить DSL-файл без генерации")
  .argument("<input>", "путь к DSL-файлу")
  .action((input: string) => {
    const inputPath = resolve(input);

    if (!existsSync(inputPath)) {
      console.error(`❌ Файл не найден: ${inputPath}`);
      process.exit(1);
    }

    try {
      const dsl = readFileSync(inputPath, "utf8");
      const ir = parseDsl(dsl);
      const result = validateIr(ir);

      if (result.ok && result.issues.length === 0) {
        console.log("✅ Валидация пройдена");
        return;
      }

      for (const issue of result.issues) {
        const icon = issue.level === "error" ? "❌" : "⚠️";
        const path = issue.path ? ` (${issue.path})` : "";
        console.log(`${icon} [${issue.code}]${path} ${issue.message}`);
      }

      if (!result.ok) process.exit(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Ошибка разбора:\n${msg}`);
      process.exit(1);
    }
  });

// ============================================================
// init
// ============================================================
program
  .command("init")
  .description("Создать шаблон DSL-файла")
  .argument("[path]", "куда сохранить", "domain.dsl.yaml")
  .action((path: string) => {
    const outPath = resolve(path);

    if (existsSync(outPath)) {
      console.error(`❌ Файл уже существует: ${outPath}`);
      process.exit(1);
    }

    const template = `domain: example.test
version: 0.0.1
name: Example Domain
description: Пример домена
author: Your Name
tags: [example]

entities:
  Item:
    name: Элемент
    label: "{title}"
    attributes:
      title: String
      description: String
      status:
        type: enum(ItemStatus)
        default: OPEN

enums:
  ItemStatus:
    OPEN: Открыт
    CLOSED: Закрыт

menus:
  - Item
`;

    writeFileSync(outPath, template, "utf8");
    console.log(`✅ Шаблон создан: ${outPath}`);
  });

// ============================================================
// inspect
// ============================================================
program
  .command("inspect")
  .description("Показать IR в JSON (для отладки)")
  .argument("<input>", "путь к DSL-файлу")
  .action((input: string) => {
    const dsl = readFileSync(resolve(input), "utf8");
    const ir = parseDsl(dsl);
    console.log(JSON.stringify(ir, null, 2));
  });

// ============================================================
// info
// ============================================================
program
  .command("info")
  .description("Краткая сводка по DSL-файлу")
  .argument("<input>", "путь к DSL-файлу")
  .action((input: string) => {
    const dsl = readFileSync(resolve(input), "utf8");
    const ir = parseDsl(dsl);

    console.log(`📦 Домен: ${ir.domain}`);
    console.log(`🏷  Название: ${ir.name ?? "—"}`);
    console.log(`🔢 Версия: ${ir.version}`);
    console.log("");

    console.log(`📋 Сущности (${ir.entities.length}):`);
    for (const e of ir.entities) {
      console.log(
        `   • ${e.id} — ${e.name ?? ""} (${e.attributes.length} атрибутов)`,
      );
    }

    if (ir.linkages.length) {
      console.log("");
      console.log(`🔗 Связи (${ir.linkages.length}):`);
      for (const l of ir.linkages) {
        const dir = l.undirected ? "↔" : "→";
        console.log(`   • ${l.side1} ${dir} ${l.side2} (${l.type})`);
      }
    }

    if (ir.dataTypes.length) {
      console.log("");
      console.log(`🎨 Типы данных (${ir.dataTypes.length}):`);
      for (const dt of ir.dataTypes) {
        console.log(
          `   • ${dt.id} (${dt.kind}, ${dt.values?.length ?? 0} значений)`,
        );
      }
    }

    if (ir.menus.length) {
      console.log("");
      console.log(`📁 Меню:`);
      for (const m of ir.menus) {
        console.log(`   • ${m.label} (${m.route})`);
        for (const it of m.items ?? []) {
          console.log(`     - ${it.label} → ${it.route}`);
        }
      }
    }
  });

// ============================================================
// Run
// ============================================================
program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
