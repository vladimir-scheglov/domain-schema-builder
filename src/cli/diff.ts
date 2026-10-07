// src/cli/diff.ts
import { diffLines } from "diff";

export interface DiffOptions {
  color: boolean;
  context: number;
  maxLines?: number;
}

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

interface DiffLine {
  type: "ctx" | "add" | "del";
  text: string;
}

export function printDiff(
  oldText: string,
  newText: string,
  opts: DiffOptions = { color: true, context: 3 },
): boolean {
  if (oldText === newText) return false;

  const parts = diffLines(oldText, newText);
  const lines: DiffLine[] = [];

  for (const p of parts) {
    const raw = p.value.replace(/\n$/, "");
    const split = raw.split("\n");
    for (const line of split) {
      if (p.added) lines.push({ type: "add", text: line });
      else if (p.removed) lines.push({ type: "del", text: line });
      else lines.push({ type: "ctx", text: line });
    }
  }

  const keep = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.type !== "ctx") {
      for (
        let j = Math.max(0, i - opts.context);
        j <= Math.min(lines.length - 1, i + opts.context);
        j++
      ) {
        keep.add(j);
      }
    }
  }

  if (keep.size === 0) return false;

  const out: string[] = [];
  let prevKept = -1;

  for (let i = 0; i < lines.length; i++) {
    if (!keep.has(i)) continue;

    if (prevKept !== -1 && i - prevKept > 1) {
      out.push(colorize("@@ ... @@", "cyan", opts.color));
    }

    const line = lines[i]!;
    if (line.type === "add") {
      out.push(colorize(`+ ${line.text}`, "green", opts.color));
    } else if (line.type === "del") {
      out.push(colorize(`- ${line.text}`, "red", opts.color));
    } else {
      out.push(colorize(`  ${line.text}`, "gray", opts.color));
    }

    prevKept = i;
  }

  const max = opts.maxLines ?? 200;
  const truncated = out.length > max;
  const shown = truncated ? out.slice(0, max) : out;

  console.log("");
  console.log(colorize("📝 Изменения:", "bold", opts.color));
  for (const l of shown) console.log(l);
  if (truncated) {
    console.log(
      colorize(`... (ещё ${out.length - max} строк)`, "gray", opts.color),
    );
  }
  console.log("");

  return true;
}

function colorize(
  s: string,
  color: keyof typeof COLORS,
  enabled: boolean,
): string {
  if (!enabled) return s;
  return COLORS[color] + s + COLORS.reset;
}

export function hasColorSupport(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return process.stdout.isTTY === true;
}
