import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export const TEXTS = {
  noOptions: `export const MANIFEST = {
  index: 'src/index.ts',

  // #region Cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  // #endregion

  // #region Helpers
  helpers: 'src/helpers.ts',
  // #endregion

  // #region Types
  types: 'src/types.ts',
  // #endregion
};
`,
  const: `export const MANIFEST = {
  index: 'src/index.ts',

  // #region Cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  // #endregion

  // #region Helpers
  helpers: 'src/helpers.ts',
  // #endregion

  // #region Types
  types: 'src/types.ts',
  // #endregion
} as const;
`,
  excludeCli: `export const MANIFEST = {
  index: 'src/index.ts',

  // #region Cli
  'cli.cli.test': 'src/cli/cli.test.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  // #endregion

  // #region Helpers
  helpers: 'src/helpers.ts',
  // #endregion

  // #region Types
  types: 'src/types.ts',
  // #endregion
};
`,
  excludeHelpers: `export const MANIFEST = {
  index: 'src/index.ts',

  // #region Cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  // #endregion

  // #region Types
  types: 'src/types.ts',
  // #endregion
};
`,
};

export const path = join(process.cwd(), 'src/.manifest.ts');

export const removePath = (_path = path) => {
  const exists = existsSync(_path);
  if (exists) unlinkSync(_path);
};

export const useBuild = (_path = path) => {
  beforeAll(() => removePath(_path));
  afterAll(() => removePath(_path));
};

export const cliTests = (
  prefix: string,
  key: keyof typeof TEXTS,
  _path = path,
) => {
  const fn = () => {
    test(`#${prefix}.01 => the file exists`, () => {
      const exists = existsSync(_path);
      expect(exists).toBe(true);
    });

    test(`#${prefix}.02 => the file contains the expected text`, () => {
      const content = readFileSync(_path, 'utf-8');
      expect(content).toContain(TEXTS[key]);
    });
  };

  return [`#${prefix} => Check the file`, fn] as const;
};
