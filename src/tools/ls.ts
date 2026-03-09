import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";

const inputSchema = z.object({
  path: z.string().optional().describe("Directory to list (defaults to cwd)"),
  recursive: z.boolean().default(false).describe("Whether to recurse into subdirectories"),
  maxDepth: z.number().int().min(1).max(6).default(2).describe("Maximum recursive depth"),
  includeHidden: z.boolean().default(false).describe("Include dotfiles"),
});

export const lsTool: Tool = {
  name: "ls",
  description: "List files and directories for a given path.",
  inputSchema,

  async call(input): Promise<ToolResult> {
    const parsed = inputSchema.parse(input);
    const root = path.resolve(parsed.path || process.cwd());

    try {
      const lines = await listEntries(root, {
        recursive: parsed.recursive,
        maxDepth: parsed.maxDepth,
        includeHidden: parsed.includeHidden,
      });

      if (lines.length === 0) {
        return { output: "No entries found." };
      }
      return { output: lines.join("\n") };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { output: `Error: ${message}`, isError: true };
    }
  },

  renderToolCall(input) {
    const parsed = inputSchema.parse(input);
    return `${colors.toolName("ls")} ${colors.fileName(parsed.path || process.cwd())}`;
  },

  renderResult(result) {
    if (result.isError) return colors.error(result.output);
    const lines = result.output.split("\n");
    if (lines.length > 40) {
      return `${lines.slice(0, 40).join("\n")}\n${colors.muted(`... (${lines.length - 40} more entries)`)}`;
    }
    return result.output;
  },
};

async function listEntries(
  root: string,
  options: { recursive: boolean; maxDepth: number; includeHidden: boolean },
): Promise<string[]> {
  const out: string[] = [];
  await walk(root, root, 0, out, options);
  return out.sort();
}

async function walk(
  base: string,
  current: string,
  depth: number,
  out: string[],
  options: { recursive: boolean; maxDepth: number; includeHidden: boolean },
) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (!options.includeHidden && entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(current, entry.name);
    const relativePath = path.relative(base, fullPath) || ".";
    out.push(entry.isDirectory() ? `${relativePath}/` : relativePath);

    if (options.recursive && entry.isDirectory() && depth < options.maxDepth - 1) {
      await walk(base, fullPath, depth + 1, out, options);
    }
  }
}
