import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export const TEXTS = {
  noOptions: `export const MANIFEST = {
  helpers: 'src/helpers.ts',
  index: 'src/index.ts',
  types: 'src/types.ts',
  'helpers.test': 'src/helpers.test.ts',

  // #region cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  // #endregion
};
`,
  const: `export const MANIFEST = {
  helpers: 'src/helpers.ts',
  index: 'src/index.ts',
  types: 'src/types.ts',
  'helpers.test': 'src/helpers.test.ts',

  // #region cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  // #endregion
} as const;
`,
  excludeCli: `export const MANIFEST = {
  helpers: 'src/helpers.ts',
  index: 'src/index.ts',
  types: 'src/types.ts',
  'helpers.test': 'src/helpers.test.ts',

  // #region cli
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  // #endregion
};
`,
  excludeHelpers: `export const MANIFEST = {
  index: 'src/index.ts',
  types: 'src/types.ts',
  'helpers.test': 'src/helpers.test.ts',

  // #region cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  // #endregion
};
`,
  excludeHelpersAll: `export const MANIFEST = {
  index: 'src/index.ts',
  types: 'src/types.ts',

  // #region cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  // #endregion
};
`,
  baseCli: `export const MANIFEST = {
  cli: 'src/cli/cli.ts',
  constants: 'src/cli/constants.ts',
  fixtures: 'src/cli/fixtures.ts',
  index: 'src/cli/index.ts',
  'cli.test': 'src/cli/cli.test.ts',
};
`,
  excludeTests: `export const MANIFEST = {
  helpers: 'src/helpers.ts',
  index: 'src/index.ts',
  types: 'src/types.ts',

  // #region cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  // #endregion
};
`,
  css: `export const MANIFEST = {
  'globals:css': 'src/globals.css',
  helpers: 'src/helpers.ts',
  index: 'src/index.ts',
  types: 'src/types.ts',
  'helpers.test': 'src/helpers.test.ts',

  // #region cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',
  // #endregion
};
`,
  txt: `export const MANIFEST = {
  helpers: 'src/helpers.ts',
  index: 'src/index.ts',
  types: 'src/types.ts',
  'helpers.test': 'src/helpers.test.ts',

  // #region cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',

  // #region bac
  'cli.bac.manifext:txt': 'src/cli/bac/manifext.txt',
  // #endregion

  // #region bac2
  'cli.bac2.other:txt': 'src/cli/bac2/other.txt',
  // #endregion
  // #endregion
};
`,
  'txt&css': `export const MANIFEST = {
  'globals:css': 'src/globals.css',
  helpers: 'src/helpers.ts',
  index: 'src/index.ts',
  types: 'src/types.ts',
  'helpers.test': 'src/helpers.test.ts',

  // #region cli
  'cli.cli': 'src/cli/cli.ts',
  'cli.constants': 'src/cli/constants.ts',
  'cli.fixtures': 'src/cli/fixtures.ts',
  'cli.index': 'src/cli/index.ts',
  'cli.cli.test': 'src/cli/cli.test.ts',

  // #region bac
  'cli.bac.manifext:txt': 'src/cli/bac/manifext.txt',
  // #endregion

  // #region bac2
  'cli.bac2.other:txt': 'src/cli/bac2/other.txt',
  // #endregion
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
    test(`#01 => the file exists`, () => {
      const exists = existsSync(_path);
      expect(exists).toBe(true);
    });

    test(`#02 => the file contains the expected text`, () => {
      const content = readFileSync(_path, 'utf-8');
      expect(content).toContain(TEXTS[key]);
    });
  };

  return [`#${prefix} => Check the file`, fn] as const;
};
