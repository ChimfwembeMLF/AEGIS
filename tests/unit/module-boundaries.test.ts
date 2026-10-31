import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MODULES = ['vision', 'motion', 'core', 'spatial'];
const SRC = resolve('src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

function relativeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const pattern = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;
  return [...source.matchAll(pattern)].map((match) => match[1] as string);
}

function findBreaches(moduleName: string): string[] {
  const moduleDir = join(SRC, moduleName);
  return sourceFiles(moduleDir).flatMap((file) =>
    relativeImports(file)
      .map((path) => resolve(dirname(file), path))
      .filter((target) => {
        const owner = relative(SRC, target).split('/')[0];
        return owner !== moduleName && owner !== 'contracts';
      })
      .map((target) => `${relative(SRC, file)} imports ${relative(SRC, target)}`),
  );
}

describe('module boundaries', () => {
  it.each(MODULES)('%s imports only itself and src/contracts', (moduleName) => {
    expect(findBreaches(moduleName)).toEqual([]);
  });

  it('every module folder has source files, so the scan cannot pass by finding nothing', () => {
    for (const moduleName of MODULES) {
      expect(sourceFiles(join(SRC, moduleName)).length).toBeGreaterThan(0);
    }
  });
});
