import { describe, expect, it } from "bun:test";
import { getAllTools, getTool, getToolDefinitions } from "./index";

describe("tool registry", () => {
  it("registers multiple tools", () => {
    const names = getAllTools().map((t) => t.name);
    expect(names.includes("glob")).toBeTrue();
    expect(names.includes("ls")).toBeTrue();
    expect(names.includes("readFile")).toBeTrue();
    expect(names.includes("grep")).toBeTrue();
    expect(names.includes("pwd")).toBeTrue();
    expect(names.includes("fileInfo")).toBeTrue();
  });

  it("returns tool definitions for all tools", () => {
    const definitions = getToolDefinitions();
    expect(definitions.length).toBe(getAllTools().length);
    expect(definitions.some((d) => d.function.name === "readFile")).toBeTrue();
  });

  it("executes pwd tool", async () => {
    const tool = getTool("pwd");
    expect(tool).toBeDefined();
    const result = await tool!.call({});
    expect(result.output.length > 0).toBeTrue();
    expect(result.isError).toBeUndefined();
  });
});
