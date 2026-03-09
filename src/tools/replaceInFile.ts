import { z } from "zod";
import fs from "node:fs/promises";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";
import { resolvePathInWorkspace } from "./pathUtils";

const inputSchema = z.object({
  path: z.string().describe("File path to edit"),
  oldString: z.string().describe("Text or regex pattern to replace"),
  newString: z.string().describe("Replacement text"),
  useRegex: z.boolean().default(false).describe("Interpret oldString as regex"),
  replaceAll: z.boolean().default(true).describe("Replace all occurrences"),
  ignoreCase: z.boolean().default(false).describe("Case-insensitive when regex"),
  dryRun: z.boolean().default(false).describe("Return preview only"),
  maxChanges: z.number().int().min(1).max(10000).default(500).describe("Maximum allowed replacements"),
});

export const replaceInFileTool: Tool = {
  name: "edit",
  description: "Replace text in an existing file with optional regex mode.",
  inputSchema,

  async call(input): Promise<ToolResult> {
    const parsed = inputSchema.parse(input);
    const absolutePath = resolvePathInWorkspace(parsed.path);

    try {
      const text = await fs.readFile(absolutePath, "utf8");
      const { next, count } = applyReplace(text, parsed);

      if (count === 0) {
        return { output: "No matches found." };
      }
      if (count > parsed.maxChanges) {
        return { output: `Error: replacement count ${count} exceeds maxChanges (${parsed.maxChanges})`, isError: true };
      }

      if (parsed.dryRun) {
        return { output: `Would replace ${count} occurrence(s) in ${absolutePath}` };
      }

      await fs.writeFile(absolutePath, next, "utf8");
      return { output: `Replaced ${count} occurrence(s) in ${absolutePath}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { output: `Error: ${message}`, isError: true };
    }
  },

  renderToolCall(input) {
    const parsed = inputSchema.parse(input);
    return `${colors.toolName("edit")} ${colors.fileName(parsed.path)} ${colors.muted(`find=${parsed.oldString}`)}`;
  },

  renderResult(result) {
    return result.isError ? colors.error(result.output) : colors.success(result.output);
  },
};

function applyReplace(
  text: string,
  args: {
    oldString: string;
    newString: string;
    useRegex: boolean;
    replaceAll: boolean;
    ignoreCase: boolean;
  },
): { next: string; count: number } {
  if (args.useRegex) {
    const flags = `${args.replaceAll ? "g" : ""}${args.ignoreCase ? "i" : ""}`;
    const pattern = new RegExp(args.oldString, flags);
    const matches = text.match(pattern);
    const count = matches ? matches.length : 0;
    return { next: text.replace(pattern, args.newString), count };
  }

  if (!args.replaceAll) {
    const idx = text.indexOf(args.oldString);
    if (idx === -1) return { next: text, count: 0 };
    return {
      next: `${text.slice(0, idx)}${args.newString}${text.slice(idx + args.oldString.length)}`,
      count: 1,
    };
  }

  if (args.oldString.length === 0) {
    return { next: text, count: 0 };
  }

  const count = text.split(args.oldString).length - 1;
  const next = text.split(args.oldString).join(args.newString);
  if (count <= 0) return { next: text, count: 0 };
  return { next, count };
}
