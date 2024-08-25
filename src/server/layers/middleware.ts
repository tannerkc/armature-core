import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { App } from '../'

export const loadMiddleware = async (app: App, middlewareDir: string) => {
  if (!existsSync(middlewareDir)) {
    // console.warn(`Middleware directory ${middlewareDir} does not exist. Skipping middleware loading.`);
    return;
  }

  const middlewareFolders = readdirSync(middlewareDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const folder of middlewareFolders) {
    const middlewarePath = join(middlewareDir, folder, 'index.ts');

    try {
      const { default: middleware } = await import(middlewarePath);

      if (typeof middleware === 'function') {
        app.use(middleware);
      } else {
        console.warn(`The middleware in ${middlewarePath} does not export a default function.`);
      }
    } catch (error) {
      console.error(`Failed to load middleware from ${middlewarePath}:`, error);
    }
  }
}
