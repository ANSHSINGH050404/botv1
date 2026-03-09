import { z } from "zod";
import fs from "node:fs/promises";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";
import { resolvePathInWorkspace } from "./pathUtils";

const inputSchema = z.object({
  path: z.string().describe("File path to read"),
  startLine: z.number().int().min(1).optional().describe("1-based start line"),
  endLine: z.number().int().min(1).optional().describe("1-based end line"),
  maxChars: z.number().int().min(100).max(20000).default(6000).describe("Maximum output characters"),
});

export const readFileTool: Tool = {
  name: "read",
  description: "Read a text file, optionally by line range.",
  inputSchema,

  async call(input): Promise<ToolResult> {
    const parsed = inputSchema.parse(input);
    const absolutePath = resolvePathInWorkspace(parsed.path);

    try {
      const raw = await fs.readFile(absolutePath, "utf8");
      const lines = raw.split(/\r?\n/);
      const start = (parsed.startLine || 1) - 1;
      const end = parsed.endLine ? Math.min(parsed.endLine, lines.length) : lines.length;
      const sliced = lines.slice(start, end);
      const numbered = sliced.map((line, idx) => `${start + idx + 1}: ${line}`).join("\n");
      const output = numbered.slice(0, parsed.maxChars);

      if (!output) {
        return { output: "No content in selected range." };
      }
      return { output };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { output: `Error: ${message}`, isError: true };
    }
  },

  renderToolCall(input) {
    const parsed = inputSchema.parse(input);
    return `${colors.toolName("read")} ${colors.fileName(parsed.path)}`;
  },

  renderResult(result) {
    return result.isError ? colors.error(result.output) : result.output;
  },
};
