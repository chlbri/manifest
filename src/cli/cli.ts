import { array, command, flag, multioption, option, string } from 'cmd-ts';
import { buildWatcher as handler } from '../helpers';
import { description, name } from './constants';

export const cli = command({
  name,
  description,
  args: {
    watch: flag({
      long: 'watch',
      short: 'w',
      description: 'Active la surveillance du dossier (mode watch)',
    }),
    baseDir: option({
      long: 'base-dir',
      short: 'b',
      description: 'Répertoire de base à scanner',
      type: string,
      defaultValue: () => 'src',
      env: 'BASE_DIR',
    }),
    excludePatterns: multioption({
      long: 'exclude',
      short: 'e',
      description:
        'Patterns de fichiers à exclure (peut être utilisé plusieurs fois)',
      type: array(string),
      // defaultValue: () => [],
    }),
    extensions: multioption({
      long: 'extensions',
      short: 'x',
      description:
        'Extensions de fichiers à inclure (peut être utilisé plusieurs fois)',
      type: array(string),
      // defaultValue: () => [],
      defaultValueIsSerializable: true,
    }),
    excludeTests: flag({
      long: 'exclude-tests',
      description: 'Exclure automatiquement les fichiers de test',
      defaultValue: () => false,
      env: 'EXCLUDE_TESTS',
    }),
    verbose: flag({
      long: 'verbose',
      short: 'v',
      description: 'Afficher les logs détaillés',
      defaultValue: () => false,
    }),
    asConst: flag({
      long: 'const',
      short: 'c',
      description:
        'Ajoute "as const" à la fin du manifest généré. (Valeur par défaut: "false")',
      env: 'AS_CONST',
    }),
  },
  handler,
});
