import { run } from 'cmd-ts';
import { cli } from './cli';
import { cliTests, useBuild } from './fixtures';

describe('CLI', () => {
  describe('#01 => Without options', () => {
    useBuild();
    test('#01.02 => Generate manifest', () => run(cli, []));
    describe(...cliTests('01.03', 'noOptions'));
  });

  describe('#02 => with options', () => {
    useBuild();

    describe('#02.01 => --const', () => {
      describe('#02.01.01 => long', () => {
        test('#02.01.01.01 => --const', () => run(cli, ['--const']));
        describe(...cliTests('02.01.01.02', 'const'));
      });
      describe('#02.01.02 => short', () => {
        test('#02.01.02.01 => -c', () => run(cli, ['-c']));
        describe(...cliTests('02.01.02.02', 'const'));
      });
    });

    describe('#02.02 => --exclude', () => {
      describe('#02.02.01 => "cli/cli.ts"', () => {
        test('#02.02.01.01 => cli', () =>
          run(cli, ['--exclude', 'cli/cli.ts']));

        describe(...cliTests('02.02', 'excludeCli'));
      });

      describe('#02.02.01 => "helpers.ts', () => {
        test('#02.02.01.01 => cli', () => run(cli, ['-e', 'helpers.ts']));

        describe(...cliTests('02.02', 'excludeHelpers'));
      });
    });

    describe('#02.03 => --verbose', () => {
      describe('#02.03.01 => long', () => {
        test('#02.03.01.01 => --verbose', () => run(cli, ['--verbose']));
        describe(...cliTests('02.03.01.02', 'noOptions'));
      });
      describe('#02.03.02 => short', () => {
        const spy = vi.spyOn(console, 'log');
        test('#02.03.02.01 => -v', () => run(cli, ['-v']));
        describe(...cliTests('02.03.02.02', 'noOptions'));
        describe('#02.03.02 => console.log', () => {
          test('#02.03.02.01 => Called with "🔍 Scan des fichiers..."', () => {
            expect(spy).toHaveBeenCalledWith('🔍 Scan des fichiers...');
          });

          test('#02.03.02.02 => Called with "🚫 Fichier exclu: .manifest.ts"', () => {
            expect(spy).toHaveBeenCalledWith(
              '🚫 Fichier exclu: .manifest.ts',
            );
          });
        });
        afterAll(() => {
          spy.mockRestore();
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
