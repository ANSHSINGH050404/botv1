import { z } from "zod";
import type { Tool, ToolResult } from "./types";
import { colors } from "../utils/colors";

const inputSchema = z.object({});

export const pwdTool: Tool = {
  name: "pwd",
  description: "Return the current working directory.",
  inputSchema,

  async call(): Promise<ToolResult> {
    return { output: process.cwd() };
  },

  renderToolCall() {
    return `${colors.toolName("pwd")}`;
  },

  renderResult(result) {
    return result.output;
  },
};
