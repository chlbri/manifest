import { run } from 'cmd-ts';
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
        test('#01 => cli', () => run(cli, ['--exclude', 'cli/cli.ts']));

        describe(...cliTests('01', 'excludeCli'));
      });

      describe('#02 => "helpers.ts"', () => {
        test('#01 => cli', () => run(cli, ['-e', 'helpers.ts']));

        describe(...cliTests('02', 'excludeHelpers'));
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

    // test('#02.03 => --ext', async () => {
    //   await run(cli, ['--ext', 'ts']);
    // });
    // describe(...testCli('02.03', 'noOptions'));

    // test('#02.04 => --exclude-tests', async () => {
    //   await run(cli, ['--exclude-tests']);
    // });
    // describe(...testCli('02.04', 'noOptions'));

    // test('#02.05 => --verbose', async () => {
    //   await run(cli, ['--verbose']);
    // });
    // describe(...testCli('02.05', 'noOptions'));

    // test('#02.06 => --manifest-path', async () => {
    //   await run(cli, ['--manifest-path', 'src/.manifest.ts']);
    // });
    // describe(...testCli('02.06', 'noOptions'));

    // test('#02.07 => --const', async () => {
    //   await run(cli, ['--const']);
    // });
    // describe(...testCli('02.07', 'noOptions'));
  });
});
