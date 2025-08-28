import { run } from 'cmd-ts';
import {
  existsSync,
  mkdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import type { MockInstance } from 'vitest';
import { cli } from './cli';
import { cliTests, useBuild } from './fixtures';

describe('CLI', () => {
  describe('#01 => Without options', () => {
    useBuild();
    test('#01 => Generate manifest', () => run(cli, []));
    describe(...cliTests('02', 'noOptions'));
  });

  describe('#02 => with options', () => {
    useBuild();

    describe('#01 => --const', () => {
      describe('#01 => long', () => {
        test('#01 => --const', () => run(cli, ['--const']));
        describe(...cliTests('01', 'const'));
      });
      describe('#02 => short', () => {
        test('#01 => -c', () => run(cli, ['-c']));
        describe(...cliTests('02', 'const'));
      });
    });

    describe('#02 => --exclude', () => {
      describe('#01 => "cli/cli.ts"', () => {
        test('#01 => cli', () =>
          run(cli, ['--exclude', 'cli/cli.ts', '-v']));

        describe(...cliTests('01', 'excludeCli'));
      });

      describe('#02 => "helpers.ts"', () => {
        test('#01 => cli', () => run(cli, ['-e', 'helpers.ts']));

        describe(...cliTests('02', 'excludeHelpers'));
      });

      describe('#03 => "helpers"', () => {
        test('#01 => cli', () => run(cli, ['-e', 'helpers']));

        describe(...cliTests('02', 'excludeHelpersAll'));
      });
    });

    describe('#03 => --verbose', () => {
      let spy: MockInstance;
      describe('#01 => long', () => {
        beforeAll(() => (spy = vi.spyOn(console, 'log')));
        test('#01 => --verbose', () => run(cli, ['--verbose']));
        describe(...cliTests('#02', 'noOptions'));
        describe('#03 => console.log', () => {
          test('#01 => Called with "🔍 Scan des fichiers..."', () => {
            expect(spy).toHaveBeenCalledWith('🔍 Scan des fichiers...');
          });

          test('#02 => Called with "🚫 Fichier exclu: .manifest.ts"', () => {
            expect(spy).toHaveBeenCalledWith(
              '🚫 Fichier exclu: .manifest.ts',
            );
          });
        });
        afterAll(() => spy.mockClear());
      });
      describe('#02 => short', () => {
        beforeAll(() => (spy = vi.spyOn(console, 'log')));
        test('#01 => -v', () => run(cli, ['-v']));
        describe(...cliTests('02', 'noOptions'));
        describe('#02 => console.log', () => {
          test('#01 => Called with "🔍 Scan des fichiers..."', () => {
            expect(spy).toHaveBeenCalledWith('🔍 Scan des fichiers...');
          });

          test('#02 => Called with "🚫 Fichier exclu: .manifest.ts"', () => {
            expect(spy).toHaveBeenCalledWith(
              '🚫 Fichier exclu: .manifest.ts',
            );
          });
        });
      });
    });

    describe('#03 => --base-dir', () => {
      let spy: MockInstance;
      describe('#01 => long', () => {
        beforeAll(() => (spy = vi.spyOn(console, 'log')));
        test('#01 => --base-dir', () => run(cli, ['--base-dir', 'src']));
        describe(...cliTests('#02', 'noOptions'));
        // describe('#03 => console.log', () => {
        //   test('#01 => Called with "🔍 Scan des fichiers..."', () => {
        //     expect(spy).toHaveBeenCalledWith('🔍 Scan des fichiers...');
        //   });

        //   test('#02 => Called with "🚫 Fichier exclu: .manifest.ts"', () => {
        //     expect(spy).toHaveBeenCalledWith(
        //       '🚫 Fichier exclu: .manifest.ts',
        //     );
        //   });
        // });
        afterAll(() => spy.mockClear());
      });
      describe('#02 => short', () => {
        beforeAll(() => (spy = vi.spyOn(console, 'log')));
        test('#01 => -b', () => run(cli, ['-b', 'src/cli']));
        describe(...cliTests('02', 'baseCli'));
        // describe('#02 => console.log', () => {
        //   test('#01 => Called with "🔍 Scan des fichiers..."', () => {
        //     expect(spy).toHaveBeenCalledWith('🔍 Scan des fichiers...');
        //   });

        //   test('#02 => Called with "🚫 Fichier exclu: .manifest.ts"', () => {
        //     expect(spy).toHaveBeenCalledWith(
        //       '🚫 Fichier exclu: .manifest.ts',
        //     );
        //   });
        // });
      });
    });

    describe('#04 => --exclude-tests', () => {
      test('#01 => cli', () => run(cli, ['--exclude-tests']));

      describe(...cliTests('01', 'excludeTests'));
    });

    describe('#02 => --extensions', () => {
      const PATHS = [
        'src/globals.css',
        'src/cli/bac/manifext.txt',
        'src/cli/bac2/other.txt',
      ].map(val => join(process.cwd(), val));
      beforeAll(() => {
        // Write files synchronously
        PATHS.forEach(path => {
          const dir = dirname(path);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          writeFileSync(path, `/* Test file for ${path} */`);
        });
      });

      afterAll(() => {
        // Clean up test files
        PATHS.forEach(unlinkSync);
        rmdirSync(join(process.cwd(), 'src/cli/bac'));
        rmdirSync(join(process.cwd(), 'src/cli/bac2'));
      });

      describe('#01 => Only ".ts", no args', () => {
        test('#01 => cli', () => run(cli, []));

        describe(...cliTests('01', 'noOptions'));
      });

      describe('#02 => Only ".ts", with args', () => {
        test('#01 => cli', () => run(cli, ['--extensions', '.ts']));

        describe(...cliTests('01', 'noOptions'));
      });

      describe('#03 => Args: ".ts, .css"', () => {
        test('#01 => cli', () =>
          run(cli, ['--extensions', '.ts,', '--extensions', '.css']));

        describe(...cliTests('01', 'css'));
      });

      describe('#04 => Args: ".ts, .txt"', () => {
        test('#01 => cli', () => run(cli, ['--extensions', '.txt']));

        describe(...cliTests('01', 'txt'));
      });

      describe('#05 => Args: ".ts, .txt, .css"', () => {
        test('#01 => cli', () =>
          run(cli, ['--extensions', '.txt', '-x', '.css']));

        describe(...cliTests('01', 'txt&css'));
      });
    });
  });
});
