import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { join } from 'path';
import { createStaticMiddleware, handleCssRequest } from './middleware/staticMiddleware';
import { debug, log } from '..';
import { handleClientRequest } from './layers/client';
import { config } from '../../index';
import { loadApiModules } from './layers/api';
import { handleHydrationRequest } from './layers/hydration';
import { hmr } from './plugins/hmrPlugin';

const publicFolder = join(process.cwd(), 'public')

const jwtConfig = config.jwt || {}
const swaggerConfig = config.api

export async function createServer() {
  const app = new Elysia();
  
  // Middleware
  app.use(swagger(swaggerConfig))
  if (jwtConfig.name && jwtConfig.secret) app.use(jwt(jwtConfig))
  const apiMap = await loadApiModules()
  const staticProvider = createStaticMiddleware(publicFolder)

  app.use(hmr({
    prefixToWatch: './public',
    extensionsToWatch: ['html', 'css', 'js'],
  }))

  debug(apiMap)

  // API Layer
  app.group('/api', (app) => {
    for (const [routePath, handlers] of apiMap.entries()) {
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

  // Hydration
  app.get('/.armature/*', handleHydrationRequest)

  // Client Layer
  app.get('*', async (c) => {
    if (c.request.url.endsWith('/global.css')) {
      return await handleCssRequest(c, publicFolder);
    }

    return await handleClientRequest(c)
  }, {
    beforeHandle: staticProvider
  });

  const port = new URL(config?.server?.url)?.port || 3000;

  try {
    app.listen(port);
    log.gen(`App running at ${app.server!.url.origin}`);
    log.info(`Your API documentation will generate at: ${app.server!.url.origin}${config.api.path}`);
  } catch (error) {
    log.error('Failed to start server:' + error);
  }
}

export type App = Awaited<ReturnType<typeof createServer>>;
