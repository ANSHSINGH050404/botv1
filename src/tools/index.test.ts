import { describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { getAllTools, getTool, getToolDefinitions } from "./index";

describe("tool registry", () => {
  it("registers multiple tools", () => {
    const names = getAllTools().map((t) => t.name);
    expect(names.includes("glob")).toBeTrue();
    expect(names.includes("ls")).toBeTrue();
    expect(names.includes("read")).toBeTrue();
    expect(names.includes("write")).toBeTrue();
    expect(names.includes("edit")).toBeTrue();
    expect(names.includes("multiEdit")).toBeTrue();
    expect(names.includes("grep")).toBeTrue();
    expect(names.includes("pwd")).toBeTrue();
    expect(names.includes("fileInfo")).toBeTrue();
  });

  it("returns tool definitions for all tools", () => {
    const definitions = getToolDefinitions();
    expect(definitions.length).toBe(getAllTools().length);
    expect(definitions.some((d) => d.function.name === "read")).toBeTrue();
    expect(definitions.some((d) => d.function.name === "write")).toBeTrue();
    expect(definitions.some((d) => d.function.name === "edit")).toBeTrue();
    expect(definitions.some((d) => d.function.name === "multiEdit")).toBeTrue();
  });

  it("executes pwd tool", async () => {
    const tool = getTool("pwd");
    expect(tool).toBeDefined();
    const result = await tool!.call({});
    expect(result.output.length > 0).toBeTrue();
    expect(result.isError).toBeUndefined();
  });

  it("supports write/edit/read flow", async () => {
    const testDir = path.resolve(process.cwd(), "tmp-tool-tests");
    const testPath = path.join(testDir, "sample.txt");
    await fs.mkdir(testDir, { recursive: true });

    const write = getTool("write");
    const edit = getTool("edit");
    const read = getTool("read");

    expect(write).toBeDefined();
    expect(edit).toBeDefined();
    expect(read).toBeDefined();

    const writeResult = await write!.call({
      path: testPath,
      content: "hello world",
      overwrite: true,
    });
    expect(writeResult.isError).toBeUndefined();

    const editResult = await edit!.call({
      path: testPath,
      oldString: "world",
      newString: "agent",
      replaceAll: false,
    });
    expect(editResult.isError).toBeUndefined();

    const readResult = await read!.call({ path: testPath });
    expect(readResult.output.includes("hello agent")).toBeTrue();
  });

  it("supports atomic multiEdit", async () => {
    const testDir = path.resolve(process.cwd(), "tmp-tool-tests");
    const testPath = path.join(testDir, "multi.txt");
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testPath, "alpha beta gamma", "utf8");

    const multiEdit = getTool("multiEdit");
    const read = getTool("read");

    expect(multiEdit).toBeDefined();
    expect(read).toBeDefined();

    const ok = await multiEdit!.call({
      path: testPath,
      edits: [
        { oldString: "alpha", newString: "ALPHA" },
        { oldString: "gamma", newString: "GAMMA" },
      ],
    });
    expect(ok.isError).toBeUndefined();

    const afterOk = await read!.call({ path: testPath });
    expect(afterOk.output.includes("ALPHA beta GAMMA")).toBeTrue();

    const fail = await multiEdit!.call({
      path: testPath,
      edits: [
        { oldString: "ALPHA", newString: "alpha" },
        { oldString: "missing", newString: "x" },
      ],
    });
    expect(fail.isError).toBeTrue();

    const afterFail = await read!.call({ path: testPath });
    expect(afterFail.output.includes("ALPHA beta GAMMA")).toBeTrue();
  });
});
