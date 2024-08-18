import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { join } from 'path';
import fs from 'fs/promises'
import { createStaticMiddleware } from './middleware/staticMiddleware';
import { debug, log } from '..';
import { handleClientRequest } from './layers/client';
import { getJWTconfig } from 'src/api';
import { config } from 'index';

const publicFolder = join(process.cwd(), 'public')
const apiDir = join(process.cwd(), 'src', 'api');

const jwtConfig = config.jwt || getJWTconfig()

const app = new Elysia();

app.use(swagger())
if (jwtConfig.name && jwtConfig.secret) app.use(jwt(jwtConfig))

export async function createServer() {
    const staticPlugin = createStaticMiddleware(publicFolder)

    // Dynamically load API routes
    const apiFiles = await fs.readdir(apiDir);
    const apiMap = new Map()

    for (const file of apiFiles) {
        const filePath = join(apiDir, file);
        const routePath = `/${file.replace('index.ts', '')}`;
        const apiModule = await import(filePath);

        apiMap.set(routePath, apiModule);
    }

    app.group('/api', (app) => {
        for (const [routePath, handlers] of apiMap.entries()) {
          // for (const method of Object.keys(handlers)) {
          //   const handler = handlers[method];
          //   app[method.toLowerCase()](routePath, typeof handler === "function" ? handler : handler.handler, {
          //     ...handler.document
          //   });
          // }

          
          if (handlers.GET) {
            const handler = handlers.GET
            app.get(routePath, typeof handler === "function" ? handler : handler.handler, {
              ...handler.document
            });
          }
          if (handlers.POST) {
            const handler = handlers.POST
            app.post(routePath, typeof handler === "function" ? handler : handler.handler, {
              ...handler.document
            });
          }
          if (handlers.DELETE) {
            const handler = handlers.DELETE
            app.delete(routePath, typeof handler === "function" ? handler : handler.handler, {
              ...handler.document
            });
          }
          if (handlers.PUT) {
            const handler = handlers.PUT
            app.put(routePath, typeof handler === "function" ? handler : handler.handler, {
              ...handler.document
            });
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

  log.gen(`App running at ${app.server!.url.origin}\n`);
  log.info(`Automatic documention for your API layer will be generated at: \n${app.server!.url.origin}/swagger`);
}

export type App = typeof app;
