import fs from 'node:fs';
import path from 'node:path';

function findPackageDir(packageName: string, searchFrom: string): string {
  let current = searchFrom;
  for (;;) {
    const candidate = path.join(current, 'node_modules', ...packageName.split('/'));
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`Could not locate package root for ${packageName}`);
    current = parent;
  }
}

function copyOnePackage(packageName: string, searchFrom: string, targetNodeModules: string, copied: Set<string>): void {
  if (copied.has(packageName)) return;
  const sourceDir = findPackageDir(packageName, searchFrom);
  const packageJson = JSON.parse(fs.readFileSync(path.join(sourceDir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  const targetDir = path.join(targetNodeModules, ...packageName.split('/'));
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
  copied.add(packageName);
  const runtimeDeps = { ...(packageJson.dependencies ?? {}), ...(packageJson.optionalDependencies ?? {}) };
  for (const dependencyName of Object.keys(runtimeDeps)) {
    copyOnePackage(dependencyName, sourceDir, targetNodeModules, copied);
  }
}

export function copyRuntimeDependencyTree(packageNames: string[], buildPath: string): void {
  const targetNodeModules = path.join(buildPath, 'node_modules');
  fs.mkdirSync(targetNodeModules, { recursive: true });
  const copied = new Set<string>();
  for (const packageName of packageNames) copyOnePackage(packageName, process.cwd(), targetNodeModules, copied);
}
