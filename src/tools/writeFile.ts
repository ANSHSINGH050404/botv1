import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";
import { resolvePathInWorkspace } from "./pathUtils";

const inputSchema = z.object({
  path: z.string().describe("File path to write"),
  content: z.string().describe("File content"),
  createIfMissing: z.boolean().default(true).describe("Create parent directories and file if missing"),
  overwrite: z.boolean().default(false).describe("Overwrite existing file"),
  append: z.boolean().default(false).describe("Append instead of replacing"),
  maxChars: z.number().int().min(1).max(100000).default(40000).describe("Max content length"),
});

export const writeFileTool: Tool = {
  name: "write",
  description: "Write content to a file with explicit safety flags.",
  inputSchema,

  async call(input): Promise<ToolResult> {
    const parsed = inputSchema.parse(input);
    const absolutePath = resolvePathInWorkspace(parsed.path);

    if (parsed.content.length > parsed.maxChars) {
      return { output: `Error: content exceeds maxChars (${parsed.maxChars})`, isError: true };
    }

    try {
      const exists = await fileExists(absolutePath);
      if (!exists && !parsed.createIfMissing) {
        return { output: "Error: target file does not exist and createIfMissing=false", isError: true };
      }
      if (exists && !parsed.overwrite && !parsed.append) {
        return { output: "Error: target exists; set overwrite=true or append=true", isError: true };
      }

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      if (parsed.append) {
        await fs.appendFile(absolutePath, parsed.content, "utf8");
      } else {
        await fs.writeFile(absolutePath, parsed.content, "utf8");
      }

      return { output: `Wrote ${parsed.content.length} chars to ${absolutePath}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { output: `Error: ${message}`, isError: true };
    }
  },

  renderToolCall(input) {
    const parsed = inputSchema.parse(input);
    return `${colors.toolName("write")} ${colors.fileName(parsed.path)}`;
  },

  renderResult(result) {
    return result.isError ? colors.error(result.output) : colors.success(result.output);
  },
};

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}
