import { existsSync } from "fs";
import { join } from "path";

const loadConfig = async () => {
    const configPath = join(process.cwd(), 'app.config.ts');

    if (existsSync(configPath)) {
      const configImport = await import(configPath);
      return configImport?.default;
    }
    return {};
};
  
export const config = await loadConfig();

export const getConfig = () => {
  return `window.__CONFIG__ = ${JSON.stringify(config)};`;
}
