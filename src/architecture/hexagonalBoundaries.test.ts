import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(__dirname, '..');

function walkFiles(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, acc);
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function read(filePath: string) {
  return fs.readFileSync(filePath, 'utf8');
}

describe('hexagonal boundaries', () => {
  it('ports stay firebase-free', () => {
    const files = walkFiles(path.join(SRC_ROOT, 'features')).filter((filePath) =>
      /ports(\..+)?\.ts$/.test(filePath)
    );
    const offenders = files.filter((filePath) => read(filePath).includes("from 'firebase/"));
    expect(offenders).toEqual([]);
  });

  it('ui does not instantiate firestore repositories', () => {
    const files = walkFiles(SRC_ROOT).filter((filePath) =>
      filePath.includes(`${path.sep}pages${path.sep}`) || filePath.includes(`${path.sep}hooks${path.sep}`)
    );
    const offenders = files.filter((filePath) =>
      /create[A-Za-z]+RepositoryFirestore\(/.test(read(filePath))
    );
    expect(offenders).toEqual([]);
  });
});
