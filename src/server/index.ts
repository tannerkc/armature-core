import { Elysia } from 'elysia';
import path, { join } from 'path';
import fs from 'fs/promises'
import { createStaticMiddleware } from './middleware/staticMiddleware';
import { log } from '..';
import { RenderedNode } from 'jsx-to-html-runtime';
import { existsSync } from 'fs';
import sveltePlugin from './plugins/sveltePlugin';
import clientPlugin from './plugins/clientPlugin';
import { handleClientRequest } from './layers/client';

const publicFolder = path.join(process.cwd(), 'public')
const apiDir = path.join(process.cwd(), 'src', 'api');
const configPath = path.join(process.cwd(), 'app.config.ts');
const configImport = existsSync(configPath) && await import(configPath)
const config = configImport?.default;


const app = new Elysia();
export async function createServer() {
    const staticPlugin = createStaticMiddleware(publicFolder)

    // Dynamically load API routes
    const apiFiles = await fs.readdir(apiDir);
    const apiMap = new Map()

    for (const file of apiFiles) {
        const filePath = path.join(apiDir, file);
        const routePath = `/${file.replace('index.ts', '')}`;
        const apiModule = await import(filePath);

        apiMap.set(routePath, apiModule);
    }

    app.group('/api', (app) => {
        for (const [routePath, handlers] of apiMap.entries()) {
            if (handlers.GET) {
                app.get(routePath, handlers.GET);
            }
            if (handlers.POST) {
                app.post(routePath, handlers.POST);
            }
            if (handlers.DELETE) {
                app.delete(routePath, handlers.DELETE);
            }
            if (handlers.PUT) {
                app.put(routePath, handlers.PUT);
            }
        }
        return app
    });
    
    app.get('*', async (c) => {
      return handleClientRequest(c)
    }, {
      beforeHandle: staticPlugin
    });

  const port = new URL(config?.server?.url)?.port || 3000;
  app.listen(port);

  log.gen(`App running at ${config?.server?.url}`);
//   log.gen(`Happy Developing!`);
}

function renderToString(element: RenderedNode): string {
  return element.string;
}

// createServer();
export type App = typeof app;
