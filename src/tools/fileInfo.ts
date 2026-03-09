import { z } from "zod";
import fs from "node:fs/promises";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";
import { resolvePathInWorkspace } from "./pathUtils";

const inputSchema = z.object({
  path: z.string().describe("Path to inspect"),
});

export const fileInfoTool: Tool = {
  name: "fileInfo",
  description: "Return metadata about a file or directory.",
  inputSchema,

  async call(input): Promise<ToolResult> {
    const parsed = inputSchema.parse(input);
    const absolutePath = resolvePathInWorkspace(parsed.path);
    try {
      const stat = await fs.stat(absolutePath);
      const payload = {
        path: absolutePath,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        createdAt: stat.birthtime.toISOString(),
      };
      return { output: JSON.stringify(payload, null, 2) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { output: `Error: ${message}`, isError: true };
    }
  },

  renderToolCall(input) {
    const parsed = inputSchema.parse(input);
    return `${colors.toolName("fileInfo")} ${colors.fileName(parsed.path)}`;
  },

  renderResult(result) {
    return result.isError ? colors.error(result.output) : result.output;
  },
};
