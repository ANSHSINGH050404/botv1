import { z } from "zod";
import fs from "node:fs/promises";
import { resolvePathInWorkspace } from "./pathUtils";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";

const editEntrySchema = z.object({
  oldString: z.string().describe("Text to replace"),
  newString: z.string().describe("Replacement text"),
  replaceAll: z.boolean().default(false).describe("Replace all occurrences for this edit"),
});

const inputSchema = z.object({
  path: z.string().describe("File path to edit"),
  edits: z.array(editEntrySchema).min(1).max(200).describe("Ordered edits to apply"),
  dryRun: z.boolean().default(false).describe("Preview only, no writes"),
  maxTotalReplacements: z.number().int().min(1).max(50000).default(2000).describe("Safety cap"),
});

export const multiEditTool: Tool = {
  name: "multiEdit",
  description: "Apply multiple ordered text edits to a single file atomically.",
  inputSchema,

  async call(input): Promise<ToolResult> {
    const parsed = inputSchema.parse(input);
    const absolutePath = resolvePathInWorkspace(parsed.path);

    try {
      const original = await fs.readFile(absolutePath, "utf8");
      let next = original;
      let totalReplacements = 0;

      for (const [i, edit] of parsed.edits.entries()) {
        const result = applySingleEdit(next, edit.oldString, edit.newString, edit.replaceAll);
        if (result.count === 0) {
          return { output: `Error: edit[${i}] oldString not found`, isError: true };
        }
        totalReplacements += result.count;
        if (totalReplacements > parsed.maxTotalReplacements) {
          return {
            output: `Error: replacement count ${totalReplacements} exceeds maxTotalReplacements (${parsed.maxTotalReplacements})`,
            isError: true,
          };
        }
        next = result.next;
      }

      if (parsed.dryRun) {
        return {
          output: `Would apply ${parsed.edits.length} edits with ${totalReplacements} replacement(s) in ${absolutePath}`,
        };
      }

      await fs.writeFile(absolutePath, next, "utf8");
      return {
        output: `Applied ${parsed.edits.length} edits with ${totalReplacements} replacement(s) in ${absolutePath}`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { output: `Error: ${message}`, isError: true };
    }
  },

  renderToolCall(input) {
    const parsed = inputSchema.parse(input);
    return `${colors.toolName("multiEdit")} ${colors.fileName(parsed.path)} ${colors.muted(`${parsed.edits.length} edits`)}`;
  },

  renderResult(result) {
    return result.isError ? colors.error(result.output) : colors.success(result.output);
  },
};

function applySingleEdit(text: string, oldString: string, newString: string, replaceAll: boolean): { next: string; count: number } {
  if (oldString.length === 0) {
    return { next: text, count: 0 };
  }

  if (!replaceAll) {
    const idx = text.indexOf(oldString);
    if (idx === -1) return { next: text, count: 0 };
    return {
      next: `${text.slice(0, idx)}${newString}${text.slice(idx + oldString.length)}`,
      count: 1,
    };
  }

  const count = text.split(oldString).length - 1;
  if (count <= 0) return { next: text, count: 0 };
  return {
    next: text.split(oldString).join(newString),
    count,
  };
}
