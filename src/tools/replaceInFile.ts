import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";

const inputSchema = z.object({
  path: z.string().describe("File path to edit"),
  find: z.string().describe("Text or regex pattern to replace"),
  replace: z.string().describe("Replacement text"),
  useRegex: z.boolean().default(false).describe("Interpret find as regex"),
  global: z.boolean().default(true).describe("Replace all occurrences"),
  ignoreCase: z.boolean().default(false).describe("Case-insensitive when regex"),
  dryRun: z.boolean().default(false).describe("Return preview only"),
  maxChanges: z.number().int().min(1).max(10000).default(500).describe("Maximum allowed replacements"),
});

export const replaceInFileTool: Tool = {
  name: "replaceInFile",
  description: "Replace text in an existing file with optional regex mode.",
  inputSchema,

  async call(input): Promise<ToolResult> {
    const parsed = inputSchema.parse(input);
    const absolutePath = path.resolve(parsed.path);

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
    return `${colors.toolName("replaceInFile")} ${colors.fileName(parsed.path)} ${colors.muted(`find=${parsed.find}`)}`;
  },

  renderResult(result) {
    return result.isError ? colors.error(result.output) : colors.success(result.output);
  },
};

function applyReplace(
  text: string,
  args: {
    find: string;
    replace: string;
    useRegex: boolean;
    global: boolean;
    ignoreCase: boolean;
  },
): { next: string; count: number } {
  if (args.useRegex) {
    const flags = `${args.global ? "g" : ""}${args.ignoreCase ? "i" : ""}`;
    const pattern = new RegExp(args.find, flags);
    const matches = text.match(pattern);
    const count = matches ? matches.length : 0;
    return { next: text.replace(pattern, args.replace), count };
  }

  if (!args.global) {
    const idx = text.indexOf(args.find);
    if (idx === -1) return { next: text, count: 0 };
    return {
      next: `${text.slice(0, idx)}${args.replace}${text.slice(idx + args.find.length)}`,
      count: 1,
    };
  }

  let count = 0;
  const next = text.split(args.find).join(() => {
    count += 1;
    return args.replace;
  } as unknown as string);
  if (text === next) return { next, count: 0 };
  return { next, count };
}
