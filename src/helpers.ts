import { watch } from 'chokidar';
import { readdir, writeFile } from 'fs/promises';
import { globSync } from 'node:fs';
import { join, relative } from 'path';
import type {
  GenerateManifestOptions,
  ManifestEntries,
  ManifestSection,
  ToArray,
  WatcherOptions,
} from './types';

export const toArray = <T>(value?: T) => {
  if (!value) return [];
  const checkArray = Array.isArray(value);
  const out = checkArray ? value : [value];

  return out as ToArray<T>;
};

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
  const withoutExt = filePath.replace(/\.ts$/, '');

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
  const { excludePatterns = [], filter, excludeTests = true } = options;

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

  // Utiliser le filtre personnalisé si fourni
  if (filter && !filter(filePath, false)) {
    return true;
  }

  return false;
}

/**
 * Génère les régions basées sur les dossiers principaux
 * @param manifestEntries - Entrées du manifest groupées
 * @returns Code TypeScript du manifest avec régions
 */
function generateManifestWithRegions(
  manifestEntries: ManifestEntries,
  asConst = false,
): string {
  let code = 'export const MANIFEST = {\n';

  // Ajouter l'entrée index en premier
  if (manifestEntries.index) {
    code += `  index: '${manifestEntries.index}',\n\n`;
    delete manifestEntries.index;
  }

  // Trier les clés par ordre alphabétique des sections principales
  const sections = Object.keys(manifestEntries)
    .filter(section => section !== 'index')
    .sort();

  sections.forEach((section, index) => {
    const entries = manifestEntries[section] as ManifestSection;

    // Ignorer les sections vides
    if (!entries || Object.keys(entries).length === 0) {
      return;
    }

    const sectionName = section.charAt(0).toUpperCase() + section.slice(1);

    code += `  // #region ${sectionName}\n`;

    // Trier les entrées dans chaque section
    const sortedKeys = Object.keys(entries).sort();

    sortedKeys.forEach(key => {
      const value = entries[key];
      const formattedKey =
        key.includes('.') || key.includes('-') ? `'${key}'` : key;
      code += `  ${formattedKey}: '${value}',\n`;
    });

    code += '  // #endregion\n';

    // Ajouter une ligne vide entre les sections sauf pour la dernière
    if (index < sections.length - 1) {
      code += '\n';
    }
  });

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

    if (verbose) {
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

    const manifestEntries: ManifestEntries = {};
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
          // Vérifier si le répertoire doit être exclu
          if (options.filter && !options.filter(relativeFilePath, true)) {
            if (verbose) {
              console.log(`🚫 Répertoire exclu: ${relativeFilePath}`);
            }
            excludedCount++;
            continue;
          }
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
          const value = `${BASE_PATH}/${relativeFilePath}`;

          // Grouper par section principale (premier segment de la clé)
          const mainSection = key.split('.')[0];

          if (mainSection === 'index') {
            manifestEntries.index = value;
          } else {
            if (!manifestEntries[mainSection]) {
              manifestEntries[mainSection] = {};
            }
            (manifestEntries[mainSection] as ManifestSection)[key] = value;
          }

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
  } catch (error) {
    console.error('❌ Erreur lors de la génération du manifest:', error);
    process.exit(1);
  }
}

/**
 * Fonction de debounce pour éviter les regénérations trop fréquentes
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | undefined;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const initialConsole = (persistent: boolean, verbose = true) => {
  if (persistent) {
    consoleStars();
    console.log(
      '📝 Le manifest sera automatiquement mis à jour lors des changements',
    );
    console.log('👀 Surveillance active sur le dossier src/');
    if (verbose) {
      console.log('⏹️  Appuyez sur Ctrl+C pour arrêter la surveillance');
    }
  }

  consoleStars();
};

export const consoleStars = () => {
  console.log();
  console.log('*'.repeat(30));
  console.log();
};

export const buildWatcher = (
  options: WatcherOptions = { watch: false },
) => {
  consoleStars();
  console.log('🚀 Génération initiale du manifest...');

  const persistent = options.watch === true;

  const ignored = [
    ...[
      ...toArray(options.excludePatterns),
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

  if (!persistent) {
    initialConsole(persistent, options.verbose);
    return generateManifest(options);
  }

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
      console.error('❌ Erreur de surveillance:', error);
    })
    .on('ready', () => {
      initialConsole(persistent, options.verbose);

      return generateManifest(options);
    });

  // Gestion propre de l'arrêt
  process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt de la surveillance...');
    await watcher.close();
    console.log('✅ Surveillance arrêtée');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await watcher.close();
    process.exit(0);
  });

  return watcher;
};
