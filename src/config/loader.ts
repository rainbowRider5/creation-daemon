import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { DEFAULT_CONFIG, type CcConfig } from './defaults.js';

let _config: CcConfig | null = null;

export function loadConfig(): CcConfig {
  if (_config) return _config;

  const configPath = join('.claude-create', 'config.yml');
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  const raw = readFileSync(configPath, 'utf-8');
  const parsed = parse(raw) as Partial<CcConfig>;
  _config = { ...DEFAULT_CONFIG, ...parsed };
  return _config;
}

export function resetConfig(): void {
  _config = null;
}
