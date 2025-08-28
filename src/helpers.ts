import { watch, type FSWatcher } from 'chokidar';
import { readdir, writeFile } from 'fs/promises';
import { globSync } from 'node:fs';
import { extname } from 'node:path';
import { join, relative } from 'path';
import type { GenerateManifestOptions, WatcherOptions } from './types';

// Configuration
export const SRC_DIR = join(process.cwd(), 'src');
export const MANIFEST_NAME = '.manifest.ts';
export const MANIFEST_FILE = join(SRC_DIR, MANIFEST_NAME);
export const BASE_PATH = 'src';

/**
 * Convertit un chemin de fichier en clé dot-notation
 * @param filePath - Chemin relatif depuis src/
 * @returns Clé en notation pointée
 */
function pathToKey(filePath: string): string {
  // Retirer l'extension .ts
  const ext = extname(filePath);
  let withoutExt = '';
  if (ext === '.ts') {
    withoutExt = filePath.replace(/\.ts$/, '');
  } else withoutExt = filePath.replace(ext, `:${ext.slice(1)}`);

  // Remplacer les slashes par des points
  let key = withoutExt.replace(/\//g, '.');

  // Gérer le cas spécial de index.ts
  if (key.endsWith('.index')) {
    key = key.replace(/\.index$/, '.index');
  }

  return key;
}

/**
 * Vérifie si un fichier doit être exclu selon les options
 * @param filePath - Chemin du fichier
 * @param options - Options de génération
 * @returns true si le fichier doit être exclu
 */
function shouldExcludeFile(
  filePath: string,
  options: GenerateManifestOptions,
): boolean {
  const { excludePatterns = [], excludeTests = true } = options;

  // Exclure automatiquement le manifest lui-même
  if (filePath.includes(MANIFEST_NAME)) return true;

  // Exclure les fichiers de test si l'option est activée
  if (
    excludeTests &&
    (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts'))
  ) {
    return true;
  }

  // Vérifier les patterns d'exclusion
  for (const pattern of excludePatterns) {
    // Pattern string - conversion simple en regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(regexPattern);
    if (regex.test(filePath)) {
      return true;
    }
  }

  return false;
}

const withRegions = (baseDir: string, ...entries: [string, string][]) => {
  const regions = entries.filter(([, value]) =>
    value.replace(`${baseDir}/`, '').includes('/'),
  );

  const noRegions = entries.filter(
    ([, value]) => !value.replace(`${baseDir}/`, '').includes('/'),
  );

  let code = noRegions.reduce((acc, [key, value]) => {
    const formattedKey =
      key.includes('.') || key.includes('-') || key.includes(':')
        ? `'${key}'`
        : key;
    acc += `  ${formattedKey}: '${value}',\n`;
    return acc;
  }, '');

  if (regions.length > 0) {
    const all = regions.reduce(
      (acc, [key, value]) => {
        const _key = value.replace(`${baseDir}/`, '').split('/')[0];
        if (!acc[_key]) acc[_key] = [];
        acc[_key].push([key, value] as const);
        return acc;
      },
      {} as Record<string, [string, string][]>,
    );

    const entries2 = Object.entries(all);
    const isLastIndex = (index: number) => index === entries2.length - 1;
    code += '\n';
    entries2.forEach(([regionName, entries3], index) => {
      code += `  // #region ${regionName}\n`;
      code += withRegions(`${baseDir}/${regionName}`, ...entries3);
      code += `  // #endregion\n`;
      if (!isLastIndex(index)) code += '\n';
    });
  }

  return code;
};

/**
 * Génère les régions basées sur les dossiers principaux
 * @param manifestEntries - Entrées du manifest groupées
 * @returns Code TypeScript du manifest avec régions
 */
function generateManifestWithRegions(
  manifestEntries: Record<string, string>,
  baseDir: string,
  asConst = false,
): string {
  let code = 'export const MANIFEST = {\n';

  const sorted = Object.entries(manifestEntries).sort(([a], [b]) => {
    const splitA = a.split('.');
    const splitB = b.split('.');
    if (splitA.length !== splitB.length) {
      return splitA.length - splitB.length;
    }
    return a.localeCompare(b);
  });

  code += withRegions(baseDir, ...sorted);

  code += `}${asConst ? ' as const;' : ';'}\n`;
  return code;
}

/**
 * Scanne tous les fichiers TypeScript dans src/ et génère le manifest
 * @param options - Options de génération du manifest
 */
export async function generateManifest(
  options: GenerateManifestOptions = {},
): Promise<void> {
  try {
    const {
      baseDir = SRC_DIR,
      verbose = false,
      excludePatterns = [],
    } = options;

    const extensions = ['.ts', ...(options.extensions || [])];

    console.log('extensions:', extensions);

    if (verbose) {
      console.log('Add extensions with option "--extensions"/"-x":');
      console.log('🔍 Scan des fichiers...');
      console.log(
        `📂 Répertoire de base: ${relative(process.cwd(), baseDir)}`,
      );
      if (excludePatterns.length > 0) {
        console.log(
          `🚫 Patterns d'exclusion: ${excludePatterns.join(', ')}`,
        );
      }
    }

    const manifestEntries: Record<string, string> = {};
    let excludedCount = 0;
    let includedCount = 0;

    /**
     * Fonction récursive pour scanner un répertoire
     */
    async function scanDirectory(
      dir: string,
      relativePath = '',
    ): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativeFilePath = relativePath
          ? `${relativePath}/${entry.name}`
          : entry.name;

        if (entry.isDirectory()) {
          // Récursion dans les sous-répertoires
          await scanDirectory(fullPath, relativeFilePath);
        }
        const isFile =
          entry.isFile() &&
          extensions.some(ext => entry.name.endsWith(ext));

        if (isFile) {
          // Vérifier si le fichier doit être exclu
          if (shouldExcludeFile(relativeFilePath, options)) {
            if (verbose) {
              console.log(`🚫 Fichier exclu: ${relativeFilePath}`);
            }
            excludedCount++;
            continue;
          }

          // Traiter les fichiers TypeScript inclus
          const key = pathToKey(relativeFilePath);
          const value = `${baseDir}/${relativeFilePath}`;

          // Grouper par section principale (premier segment de la clé)
          manifestEntries[key] = value;

          includedCount++;
          if (verbose) {
            console.log(`✅ Fichier inclus: ${relativeFilePath} → ${key}`);
          }
        }
      }
    }

    await scanDirectory(baseDir);

    // Générer le code TypeScript
    const manifestCode = generateManifestWithRegions(
      manifestEntries,
      baseDir,
      options.asConst,
    );

    // Écrire le fichier
    await writeFile(MANIFEST_FILE, manifestCode, 'utf8');

    if (verbose) {
      console.log('✅ Manifest généré avec succès !');
      console.log(`📁 Fichiers inclus: ${includedCount}`);
      if (excludedCount > 0) {
        console.log(`🚫 Fichiers exclus: ${excludedCount}`);
      }
      console.log(
        `📍 Fichier généré: ${relative(process.cwd(), MANIFEST_FILE)}`,
      );
      console.log();
      console.log('*'.repeat(30));
    }

    console.log('✅ Manifest généré avec succès !');
    consoleStars();
    /* v8 ignore next 4 => Added for safety */
  } catch (error) {
    console.error('❌ Erreur lors de la génération du manifest:', error);
    process.exit(1);
  }
}

export const consoleStars = () => {
  console.log();
  console.log('*'.repeat(30));
  console.log();
};

export function buildWatcher(
  options?: WatcherOptions & { watch: true },
): FSWatcher;
export function buildWatcher(
  options?: WatcherOptions & { watch: false },
): Promise<void>;
export function buildWatcher(
  options?: WatcherOptions,
): Promise<void> | FSWatcher;

export function buildWatcher(options: WatcherOptions = { watch: false }) {
  consoleStars();
  console.log('🚀 Génération initiale du manifest...');

  const persistent = options.watch === true;

  const ignored = [
    ...[
      ...(options.excludePatterns ?? []),
      '**/*.test.ts', // Ignorer les fichiers de test
      '**/*.spec.ts', // Ignorer les fichiers de spec
    ]
      .map(val => globSync(val))
      .flat()
      .map(val => {
        return join(process.cwd(), val);
      }),
    relative(process.cwd(), MANIFEST_FILE), // Ignorer le fichier manifest lui-même
  ];

  if (!persistent) return generateManifest(options);

  const src = options.baseDir || SRC_DIR;

  const watcher = watch(src, {
    ignored,
    persistent,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
    cwd: process.cwd(),
  });

  watcher
    .on('add', (filePath: string) => {
      if (options.verbose) {
        consoleStars();
        console.log(`➕ Fichier créé: ${relative(src, filePath)}`);
        consoleStars();
      }

      return generateManifest({ ...options, verbose: false });
    })
    .on('change', (filePath: string) => {
      if (options.verbose) {
        consoleStars();
        console.log(`🔄 Fichier modifié: ${relative(src, filePath)}`);
        consoleStars();
      }

      return generateManifest({ ...options, verbose: false });
    })
    .on('unlink', (filePath: string) => {
      if (options.verbose) {
        consoleStars();
        console.log(`🗑️ Fichier supprimé: ${relative(src, filePath)}`);
        consoleStars();
      }

      return generateManifest({ ...options, verbose: false });
    })
    .on('error', (error: unknown) => {
      /* v8 ignore next 1 */
      console.error('❌ Erreur de surveillance:', error);
    })
    .on('ready', () => {
      consoleStars();
      console.log(
        '📝 Le manifest sera automatiquement mis à jour lors des changements',
      );
      console.log('👀 Surveillance active sur le dossier src/');
      if (options.verbose) {
        console.log('⏹️  Appuyez sur Ctrl+C pour arrêter la surveillance');
      }
      return generateManifest(options);
    });

  // #region Gestion propre de l'arrêt
  /* v8 ignore next 5 => Added for safety */
  process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt de la surveillance...');
    await watcher.close();
    console.log('✅ Surveillance arrêtée');
    process.exit(0);
  });

  /* v8 ignore next 3 => Added for safety */
  process.on('SIGTERM', async () => {
    await watcher.close();
    process.exit(0);
  });
  // #endregion

  return watcher;
}
