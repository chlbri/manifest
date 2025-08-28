export type AnyArray<T = unknown> = ReadonlyArray<T> | T[];

export type ToArray<T> = T extends AnyArray ? T : AnyArray<T>;

export type GenerateManifestOptions = {
  /** Patterns de fichiers à exclure (glob patterns ou regex), realtives to baseDir */
  excludePatterns?: string[];
  /** Exclure automatiquement les fichiers de test */
  excludeTests?: boolean;
  /** Répertoire de base pour le scan (par défaut: SRC_DIR) */
  baseDir?: string;
  /** Afficher les logs détaillés */
  extensions?: string[];
  verbose?: boolean;
  asConst?: boolean;
};

export type WatcherOptions = GenerateManifestOptions & {
  /** Dossier à surveiller (par défaut: SRC_DIR) */
  watch?: boolean;
};
