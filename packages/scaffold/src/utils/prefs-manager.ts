import { readFile } from "node:fs/promises";
import { outputFile } from "fs-extra/esm";
import { logger } from "./log.js";

export type Prefs = Record<string, string | number | boolean | undefined | null>;

export class PrefsManager {
  private namespace: "pref" | "user_pref";
  private prefs: Prefs = {};

  constructor(namespace: "pref" | "user_pref") {
    this.namespace = namespace;
  }

  parse(content: string) {
    const _map: Prefs = {};
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const prefPattern = /^(pref|user_pref)\s*\(\s*["']([^"']+)["']\s*,\s*(.+)\s*\)\s*;?$/gm;
    const matches = content.matchAll(prefPattern);
    for (const match of matches) {
      const key = match[2].trim();
      const value = match[3].trim();
      _map[key] = this.cleanValue(value);
    };
    return _map;
  }

  cleanValue(value: string) {
    if (value === "true")
      return true;
    else if (value === "false")
      return false;
    else if (!Number.isNaN(Number(value)))
      return Number(value);
    else if (value.match(/^["'](.*)["']$/))
      return value.replace(/^["'](.*)["']$/, "$1");
    else
      return value;
  }

  render() {
    return Object.entries(this.prefs).map(([key, value]) => {
      const _v = typeof value === "string" ? `"${value}"` : value;
      return `${this.namespace}("${key}", ${_v});`;
    }).join("\n");
  }

  async read(path: string) {
    const content = await readFile(path, "utf-8");
    const map = this.parse(content);
    this.setPrefs(map);
  }

  async write(path: string) {
    const content = this.render();
    // console.log(content);
    await outputFile(path, content, "utf-8");
    logger.debug("The prefs.js has been modified.");
  }

  setPref(key: string, value: any) {
    if (value === null || value === undefined) {
      if (key in this.prefs)
        delete this.prefs[key];
      return;
    }

    this.prefs[key] = value;
  };

  setPrefs(prefs: Prefs) {
    Object.entries(prefs).forEach(([key, value]) => {
      this.setPref(key, value);
    });
  }

  getPref(key: string) {
    return this.prefs[key] ?? undefined;
  }

  getPrefs() {
    return this.prefs;
  }

  clearPrefs() {
    this.prefs = {};
  }

  getPrefsWithPrefix(prefix: string) {
    const _prefs: Prefs = {};
    for (const pref in this.prefs) {
      if (pref.startsWith(prefix))
        _prefs[pref] = this.prefs[pref];
      else
        _prefs[`${prefix}.${pref}`] = this.prefs[pref];
    }
    return _prefs;
  }

  getPrefsWithoutPrefix(prefix: string) {
    const _prefs: Prefs = {};
    for (const pref in this.prefs) {
      _prefs[pref.replace(`${prefix}.`, "")] = this.prefs[pref];
    }
    return _prefs;
  }
}

export function renderPluginPrefsDts(prefs: Prefs) {
  return `// Generated by zotero-plugin-scaffold
/* prettier-ignore */
/* eslint-disable */
// @ts-nocheck

// prettier-ignore
declare namespace _ZoteroTypes {
  interface Prefs {
    PluginPrefsMap: {
      ${Object.entries(prefs).map(([key, value]) => {
        return `"${key}": ${typeof value};`;
      }).join("\n      ")}
    };
  }
}
`;
}

/** Backup */
// // prettier-ignore
// type PluginPrefKey<K extends keyof _PluginPrefsMap> = \`${prefix}.\${K}\`;
//
// // prettier-ignore
// type PluginPrefsMap = {
//   [K in keyof _PluginPrefsMap as PluginPrefKey<K>]: _PluginPrefsMap[K]
// };
//
// declare namespace _ZoteroTypes {
//   interface Prefs {
//     get: <K extends keyof PluginPrefsMap>(key: K, global?: boolean) => PluginPrefsMap[K];
//     set: <K extends keyof PluginPrefsMap>(key: K, value: PluginPrefsMap[K], global?: boolean) => any;
//   }
// }
