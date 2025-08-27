# Guide Chokidar - Surveillance de fichiers efficace

Chokidar est une librairie JavaScript qui permet de surveiller les fichiers
et répertoires de façon cross-platform. Utilisée par plus de 35 millions de
projets sur GitHub, elle fournit une interface normalisée pour la
surveillance de fichiers basée sur `fs.watch` et `fs.watchFile`.

## Pourquoi Chokidar ?

### Avantages par rapport à `fs.watch` / `fs.watchFile` natifs

- **Événements proprement rapportés** : Les événements sur macOS incluent
  les noms de fichiers, pas de doublons
- **Événements normalisés** : `add`, `change`, `unlink` au lieu de `rename`
  peu informatif
- **Support des écritures atomiques** : Filtrage automatique des artefacts
  d'éditeurs avec `atomic`
- **Support des écritures en chunks** : Option `awaitWriteFinish` pour les
  gros fichiers
- **Filtrage de fichiers/répertoires** : Support des patterns, fonctions et
  regex
- **Support des liens symboliques** : Surveillance configurable des
  symlinks
- **Surveillance récursive** : Toujours supportée contrairement à
  l'implémentation native partielle
- **Limitation de profondeur** : Contrôle de la récursion avec l'option
  `depth`

## Installation

```bash
npm install chokidar
```

## Utilisation de base

### Import et surveillance simple

```javascript
import chokidar from 'chokidar';

// Surveillance simple du répertoire courant
chokidar.watch('.').on('all', (event, path) => {
  console.log(event, path);
});
```

### Configuration avancée

```javascript
// Initialisation avec options
const watcher = chokidar.watch('file, dir, or array', {
  ignored: (path, stats) => stats?.isFile() && !path.endsWith('.js'), // seulement les fichiers .js
  persistent: true,
});

// Gestion des événements
const log = console.log.bind(console);

watcher
  .on('add', path => log(`Fichier ${path} ajouté`))
  .on('change', path => log(`Fichier ${path} modifié`))
  .on('unlink', path => log(`Fichier ${path} supprimé`))
  .on('addDir', path => log(`Répertoire ${path} ajouté`))
  .on('unlinkDir', path => log(`Répertoire ${path} supprimé`))
  .on('error', error => log(`Erreur watcher: ${error}`))
  .on('ready', () =>
    log('Scan initial terminé. Prêt pour les changements'),
  );
```

## API et Méthodes

### Méthodes principales

```javascript
// Ajouter des fichiers/répertoires à surveiller
watcher.add('nouveau-fichier');
watcher.add(['fichier-2', 'fichier-3']);

// Obtenir la liste des chemins surveillés
let watchedPaths = watcher.getWatched();

// Arrêter la surveillance de certains fichiers
await watcher.unwatch('nouveau-fichier');

// Fermer le watcher (méthode async)
await watcher.close().then(() => console.log('fermé'));
```

### Événements disponibles

- **`add`** : Fichier ajouté au système de fichiers
- **`change`** : Fichier modifié
- **`unlink`** : Fichier supprimé
- **`addDir`** : Répertoire ajouté
- **`unlinkDir`** : Répertoire supprimé
- **`ready`** : Scan initial terminé, prêt pour les changements
- **`raw`** : Événement brut (usage interne, utiliser avec précaution)
- **`error`** : Erreur survenue
- **`all`** : Émis pour tous les événements sauf `ready`, `raw`, et `error`

### Accès aux stats de fichiers

```javascript
// Les événements 'add', 'addDir' et 'change' peuvent recevoir fs.Stats en deuxième argument
watcher.on('change', (path, stats) => {
  if (stats)
    console.log(`Fichier ${path} a changé de taille: ${stats.size}`);
});
```

## Options de configuration

### Persistance

```javascript
{
  persistent: true; // (défaut: true) - Le processus continue tant que des fichiers sont surveillés
}
```

### Filtrage de chemins

```javascript
{
  // Ignorer certains fichiers/chemins
  ignored: (path, stats) => stats?.isFile() && !path.endsWith('.js'), // fonction
  ignored: /node_modules/, // regex
  ignored: 'node_modules/**', // pattern (v3 seulement)

  ignoreInitial: false, // (défaut: false) - Émettre add/addDir lors de l'instantiation
  followSymlinks: true, // (défaut: true) - Suivre les liens symboliques
  cwd: '.', // Répertoire de base pour les chemins relatifs
}
```

### Performance

```javascript
{
  // Utiliser le polling au lieu de fs.watch
  usePolling: false, // (défaut: false) - Nécessaire pour les réseaux

  // Paramètres de polling (quand usePolling: true)
  interval: 100, // (défaut: 100ms) - Intervalle de polling
  binaryInterval: 300, // (défaut: 300ms) - Intervalle pour fichiers binaires

  // Autres options de performance
  alwaysStat: false, // (défaut: false) - Toujours fournir fs.Stats
  depth: undefined, // Limiter la profondeur de récursion

  // Attendre la fin d'écriture avant d'émettre l'événement
  awaitWriteFinish: {
    stabilityThreshold: 2000, // (défaut: 2000ms) - Temps de stabilité
    pollInterval: 100 // (défaut: 100ms) - Intervalle de vérification
  }
}
```

### Gestion des erreurs

```javascript
{
  ignorePermissionErrors: false, // (défaut: false) - Ignorer les erreurs EPERM/EACCES

  // Filtrer les écritures atomiques
  atomic: true, // (défaut: true si !useFsEvents && !usePolling)
  atomic: 100, // Délai personnalisé en ms
}
```

## Patterns d'utilisation avancés

### Surveillance avec filtrage sophistiqué

```javascript
const watcher = chokidar.watch('.', {
  ignored: (path, stats) => {
    // Ignorer node_modules
    if (path.includes('node_modules')) return true;

    // Surveiller seulement les fichiers TypeScript et JavaScript
    if (stats?.isFile()) {
      return !['.ts', '.js', '.tsx', '.jsx'].some(ext =>
        path.endsWith(ext),
      );
    }

    return false;
  },

  // Optimisations
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100,
  },
});
```

### Debouncing manuel des événements

```javascript
const debounceMap = new Map();
const DEBOUNCE_DELAY = 300;

watcher.on('change', path => {
  // Annuler le timer précédent
  if (debounceMap.has(path)) {
    clearTimeout(debounceMap.get(path));
  }

  // Créer un nouveau timer
  const timer = setTimeout(() => {
    console.log(`Fichier vraiment modifié: ${path}`);
    debounceMap.delete(path);
  }, DEBOUNCE_DELAY);

  debounceMap.set(path, timer);
});
```

### Surveillance conditionnelle avec reload

```javascript
class ProjectWatcher {
  constructor(config) {
    this.config = config;
    this.watcher = null;
  }

  async start() {
    this.watcher = chokidar.watch(this.config.paths, {
      ignored: this.config.ignored,
      persistent: true,
    });

    this.watcher
      .on('change', this.handleChange.bind(this))
      .on('add', this.handleAdd.bind(this))
      .on('unlink', this.handleUnlink.bind(this))
      .on('ready', () => console.log('Watcher prêt'));
  }

  async restart() {
    if (this.watcher) {
      await this.watcher.close();
    }
    await this.start();
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  handleChange(path) {
    console.log(`Changement détecté: ${path}`);
    // Logique de rebuild, reload, etc.
  }

  handleAdd(path) {
    console.log(`Nouveau fichier: ${path}`);
  }

  handleUnlink(path) {
    console.log(`Fichier supprimé: ${path}`);
  }
}
```

## Migration v3 → v4

### Suppression du support des globs

```javascript
// v3 (deprecated)
chokidar.watch('**/*.js');
chokidar.watch('./directory/**/*');

// v4 - Utiliser les options de filtrage
chokidar.watch('.', {
  ignored: (path, stats) => stats?.isFile() && !path.endsWith('.js'),
});
chokidar.watch('./directory');

// Alternative avec glob externe
import { glob } from 'node:fs/promises';
const watcher = chokidar.watch(await Array.fromAsync(glob('**/*.js')));
```

### Changements de dépendances

- **v4** : 1 seule dépendance (vs 13 en v3)
- **fsevents** : Plus inclus en bundle, installation optionnelle
- **Node.js** : Minimum v14+ (vs v8+ en v3)
- **TypeScript** : Réécrit en TypeScript natif

## Dépannage

### Erreurs EMFILE / ENOSPC

**Problème** : Chokidar manque de handles de fichiers

```bash
# Erreurs typiques
Error: watch /home/ ENOSPC
bash: cannot set terminal process group (-1): Inappropriate ioctl for device
```

**Solutions** :

1. **Pour les opérations fs génériques** - Utiliser graceful-fs :

```javascript
const fs = require('fs');
const gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(fs);
```

2. **Tuning OS** (Linux) :

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

3. **Pour fs.watch spécifiquement** - Passer au polling :

```javascript
chokidar.watch('.', { usePolling: true });
```

### Variables d'environnement

```bash
# Forcer le polling
export CHOKIDAR_USEPOLLING=1

# Définir l'intervalle de polling
export CHOKIDAR_INTERVAL=200
```

### Problèmes de performance

- **Trop de fichiers surveillés** : Utiliser `ignored` pour filtrer
- **CPU élevé** : Réduire `interval`, augmenter `binaryInterval`
- **Retards d'événements** : Ajuster `awaitWriteFinish.stabilityThreshold`
- **Réseau/Docker** : Utiliser `usePolling: true`

## Exemples d'intégration

### Avec un bundler personnalisé

```javascript
import chokidar from 'chokidar';
import { buildProject } from './build.js';

const watcher = chokidar.watch('src', {
  ignored: /node_modules/,
  awaitWriteFinish: true,
});

let building = false;

watcher.on('change', async path => {
  if (building) return;

  building = true;
  console.log(`Rebuilding due to ${path}...`);

  try {
    await buildProject();
    console.log('Build successful');
  } catch (error) {
    console.error('Build failed:', error);
  } finally {
    building = false;
  }
});
```

### Avec Hot Module Replacement

```javascript
import chokidar from 'chokidar';
import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8080 });
const watcher = chokidar.watch('src');

watcher.on('change', path => {
  const message = JSON.stringify({
    type: 'file-changed',
    path: path.replace(process.cwd(), ''),
    timestamp: Date.now(),
  });

  // Notifier tous les clients connectés
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});
```

## Bonnes pratiques

1. **Fermez toujours vos watchers** : Utilisez `await watcher.close()` pour
   éviter les fuites mémoire

2. **Filtrez intelligemment** : N'surveillez que ce dont vous avez besoin
   avec `ignored`

3. **Gérez les écritures atomiques** : Utilisez `atomic: true` pour les
   éditeurs modernes

4. **Adaptez aux gros fichiers** : Configurez `awaitWriteFinish` pour les
   fichiers volumineux

5. **Considérez le polling** : Utilisez `usePolling: true` pour Docker,
   réseau, ou VMs

6. **Gérez les erreurs** : Toujours écouter l'événement `error`

7. **Testez la performance** : Surveillez l'utilisation CPU/mémoire selon
   votre cas d'usage

8. **Variables d'environnement** : Permettez la configuration via
   `CHOKIDAR_USEPOLLING` et `CHOKIDAR_INTERVAL`

## Ressources

- **Repository GitHub** :
  [paulmillr/chokidar](https://github.com/paulmillr/chokidar)
- **Documentation npm** :
  [npmjs.com/package/chokidar](https://www.npmjs.com/package/chokidar)
- **CLI externe** :
  [chokidar-cli](https://github.com/open-cli-tools/chokidar-cli)
- **Utilisé par** : 35+ millions de projets GitHub

---

_Guide créé pour faciliter l'intégration et l'utilisation efficace de
Chokidar dans vos projets Node.js._
