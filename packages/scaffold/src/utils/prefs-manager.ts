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

  private parse(content: string) {
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const prefPattern = /^(pref|user_pref)\s*\(\s*["']([^"']+)["']\s*,\s*(.+)\s*\)\s*;$/gm;
    const matches = content.matchAll(prefPattern);
    for (const match of matches) {
      const key = match[2].trim();
      const value = match[3].trim();

      this.setPref(key, value);
    };
  }

  private render() {
    return Object.entries(this.prefs).map(([key, value]) => {
      return `${this.namespace}("${key}", ${value});`;
    }).filter(c => !!c).join("\n");
  }

  async read(path: string) {
    const content = await readFile(path, "utf-8");
    this.parse(content);
  }

  async write(path: string) {
    const content = this.render();
    // console.log(content);
    await outputFile(path, content, "utf-8");
    logger.debug("The <profile>/prefs.js has been modified.");
  }

  setPref(key: string, value: any) {
    let cleanValue: any;
    if (value === null || value === undefined) {
      if (key in this.prefs)
        delete this.prefs[key];
      else
        return;
    }
    else if (value === "true") {
      cleanValue = true;
    }
    else if (value === "false") {
      cleanValue = false;
    }
    else if (typeof value === "boolean") {
      cleanValue = value;
    }
    else if (!Number.isNaN(Number(value))) {
      cleanValue = Number(value);
    }
    else if (typeof value === "number") {
      cleanValue = value;
    }
    else if (typeof value === "string") {
      cleanValue = value; // `${value.replace("\n", "\\n")}`;
    }
    else {
      cleanValue = value;
    }

    this.prefs[key] = cleanValue;
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

export function renderPluginPrefsDts(prefs: Prefs, prefix: string) {
  const dtsContent = `// Generated by zotero-plugin-scaffold
/* prettier-ignore */
/* eslint-disable */
// @ts-nocheck

// prettier-ignore
type _PluginPrefsMap = {
  ${Object.entries(prefs).map(([key, value]) => {
    return `"${key}": ${typeof value};`;
  }).join("\n  ")}
};

// prettier-ignore
type PluginPrefKey<K extends keyof _PluginPrefsMap> = \`${prefix}.\${K}\`;

// prettier-ignore
type PluginPrefsMap = {
  [K in keyof _PluginPrefsMap as PluginPrefKey<K>]: _PluginPrefsMap[K]
};
`;
  return dtsContent;
}

const _backup = `
// declare namespace _ZoteroTypes {
//   interface Prefs {
//     get: <K extends keyof PluginPrefsMap>(key: K, global?: boolean) => PluginPrefsMap[K];
//     set: <K extends keyof PluginPrefsMap>(key: K, value: PluginPrefsMap[K], global?: boolean) => any;
//   }
// }
`;
