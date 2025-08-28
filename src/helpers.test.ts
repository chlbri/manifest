import type { FSWatcher } from 'chokidar';
import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { buildWatcher, MANIFEST_FILE, SRC_DIR } from './helpers';

const TEST_FILE1 = join(SRC_DIR, 'test-helper-file.ts');
const TEST_FILE2 = join(SRC_DIR, 'test-helper-file2.ts');
const MANIFEST_PATH = MANIFEST_FILE;

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('buildWatcher (persistent mode)', () => {
  const fixture = (verbose = false) => {
    return () => {
      let watcher: FSWatcher;

      beforeAll(() => {
        // Nettoyage avant
        [TEST_FILE1, TEST_FILE2, MANIFEST_PATH].forEach(f => {
          if (existsSync(f)) unlinkSync(f);
        });
        watcher = buildWatcher({ watch: true, verbose });
        // Attendre que le watcher soit prêt
        return wait(500);
      });

      afterAll(async () => {
        if (watcher && watcher.close) await watcher.close();
        [TEST_FILE1, TEST_FILE2, MANIFEST_PATH].forEach(f => {
          if (existsSync(f)) unlinkSync(f);
        });
      });

      it('#01 => should generate manifest on add', async () => {
        writeFileSync(TEST_FILE1, 'export const foo = 1;');
        await wait(500);
        expect(existsSync(MANIFEST_PATH)).toBe(true);
        const content = readFileSync(MANIFEST_PATH, 'utf-8');
        expect(content).toContain('test-helper-file');
      });

      it('#02 => should update manifest on change', async () => {
        let content = readFileSync(MANIFEST_PATH, 'utf-8');
        expect(content).toContain('test-helper-file');
        writeFileSync(TEST_FILE2, 'export const bar = 2;');
        await wait(500);
        content = readFileSync(MANIFEST_PATH, 'utf-8');
        expect(content).toContain('test-helper-file2');

        // Modifier le fichier
        writeFileSync(TEST_FILE2, 'export const bar = 3;');
        await wait(500);
        content = readFileSync(MANIFEST_PATH, 'utf-8');
        expect(content).toContain('test-helper-file2');
      });

      it('#03 => should update manifest on remove', async () => {
        let content = readFileSync(MANIFEST_PATH, 'utf-8');
        expect(content).toContain('test-helper-file');
        expect(content).toContain('test-helper-file2');
        unlinkSync(TEST_FILE2);
        await wait(500);
        content = readFileSync(MANIFEST_PATH, 'utf-8');
        expect(existsSync(TEST_FILE2)).toBe(false);
        expect(content).toContain('test-helper-file');
        expect(content).not.toContain('test-helper-file2');
      });
    };
  };
  describe('#01 => not verbose', fixture());

  describe('#01 => verbose', fixture(true));
});
