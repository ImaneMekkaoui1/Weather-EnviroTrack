/**
 * Polyfills pour l'application
 */

// Zone.js est nécessaire pour Angular
import 'zone.js';

// Importation des polyfills pour les modules Node.js
import { Buffer } from 'buffer';
import * as process from 'process';

// Polyfills pour les modules Node.js dans le navigateur
(window as any).global = window;
(window as any).process = process;
(window as any).Buffer = Buffer;

// Fix pour les modules externalisés par Vite
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Fix pour require dans le navigateur (utilisé par certains modules)
(window as any).require = function(module: string) {
  // Gestionnaire spécial pour les modules problématiques
  if (module === 'util' || module.startsWith('util/')) {
    return {
      debuglog: () => {},
      inspect: () => {},
      inherits: function(ctor: any, superCtor: any) {
        ctor.super_ = superCtor;
        Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
      },
      format: function(format: string, ...args: any[]) {
        return format.replace(/%[sdjifoO%]/g, (match) => {
          if (match === '%%') return '%';
          if (args.length === 0) return match;
          const arg = args.shift();
          switch (match) {
            case '%s': return String(arg);
            case '%d': return Number(arg).toString();
            default: return arg;
          }
        });
      },
      promisify: (fn: Function) => fn
    };
  }
  
  if (module === 'buffer/') {
    return { Buffer };
  }
  
  return null;
};

// Fix pour L (Leaflet) non défini
if (typeof (window as any).L === 'undefined') {
  console.warn('Leaflet non disponible, création d\'un substitut temporaire');
  (window as any).L = {};
}