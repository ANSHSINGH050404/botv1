import path from "node:path";

export function resolvePathInWorkspace(inputPath: string): string {
  const workspaceRoot = path.resolve(process.cwd());
  const absolutePath = path.resolve(inputPath);
  const relative = path.relative(workspaceRoot, absolutePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside workspace: ${absolutePath}`);
  }

  return absolutePath;
}
