import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";

const inputSchema = z.object({
  pattern: z.string().describe("Regex pattern to search"),
  path: z.string().optional().describe("Root path to search (defaults to cwd)"),
  include: z.string().default("**/*").describe("Glob include pattern"),
  ignoreCase: z.boolean().default(true).describe("Case-insensitive search"),
  maxMatches: z.number().int().min(1).max(200).default(50).describe("Maximum number of matches"),
});

export const grepTool: Tool = {
  name: "grep",
  description: "Search file contents using a regex pattern.",
  inputSchema,

  async call(input): Promise<ToolResult> {
    const parsed = inputSchema.parse(input);
    const cwd = path.resolve(parsed.path || process.cwd());

    try {
      const regex = new RegExp(parsed.pattern, parsed.ignoreCase ? "i" : "");
      const files = await glob(parsed.include, {
        cwd,
        absolute: true,
        nodir: true,
        dot: false,
      });
      files.sort();

      const hits: string[] = [];
      for (const file of files) {
        if (hits.length >= parsed.maxMatches) break;
        let text: string;
        try {
          text = await fs.readFile(file, "utf8");
        } catch {
          continue;
        }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
          if (hits.length >= parsed.maxMatches) break;
          if (regex.test(lines[i] || "")) {
            hits.push(`${file}:${i + 1}: ${lines[i]}`);
          }
        }
      }

      if (hits.length === 0) {
        return { output: "No matches found." };
      }
      return { output: hits.join("\n") };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { output: `Error: ${message}`, isError: true };
    }
  },

  renderToolCall(input) {
    const parsed = inputSchema.parse(input);
    return `${colors.toolName("grep")} ${colors.fileName(parsed.pattern)}`;
  },

  renderResult(result) {
    if (result.isError) return colors.error(result.output);
    const lines = result.output.split("\n");
    if (lines.length > 60) {
      return `${lines.slice(0, 60).join("\n")}\n${colors.muted(`... (${lines.length - 60} more matches)`)}`;
    }
    return result.output;
  },
};
