import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { join } from 'path';
import { createStaticMiddleware, handleCssRequest } from './middleware/staticMiddleware';
import { log } from '..';
import { handleClientRequest } from './layers/client';
import { config } from '../../index';
import { loadModules } from './layers/api';
import { handleHydrationRequest } from './layers/hydration';
import { hmr } from './plugins/hmrPlugin';
import { loadMiddleware } from './layers/middleware';

const publicFolder = join(process.cwd(), 'public')

const jwtConfig = config.jwt || {}
const swaggerConfig = config.api

const apiMap = await loadModules('/api')
const wsMap = await loadModules('/ws')

const staticProvider = createStaticMiddleware(publicFolder)

const app = new Elysia()
  .use(swagger(swaggerConfig))
  .use(jwt(jwtConfig))
  .use(hmr({
      srcDir: './src',
      outDir: './.armature',
  }))
  .derive(({ headers }) => {
      const auth = headers['authorization'];
      return {
          bearer: auth?.startsWith('Bearer ') ? auth.slice(7) : null
      };
  })
  .group('api', (app) => {
    // TODO: consider refactor lazy loaded modules
    // TODO: fix Elysia Eden type safety
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
  })
  .group('ws', (app) => {
    // TODO: consider refactor lazy loaded modules
    // TODO: fix Elysia Eden type safety
    for (const [routePath, handler] of wsMap.entries()) {
      app.ws(routePath, handler.default)
    }
    return app
  })

await loadMiddleware(app, join(process.cwd(), 'src', 'middleware'));

app.get('/.armature/*', handleHydrationRequest)
app.get('*', async (c) => {
  if (c.request.url.endsWith('/global.css')) {
    return await handleCssRequest(c, publicFolder);
  }

  return await handleClientRequest(c)
}, {
  beforeHandle: staticProvider
})
.onError(({ code }) => {
  if (code === 'NOT_FOUND') return 'Route not found :('
})

export async function createServer() {
  const port = config?.server?.url ? new URL(config.server.url).port : 3000;

  try {
    app.listen(port);
    log.gen(`App running at ${app.server!.url.origin}`);
    log.info(`Your API documentation will generate at: ${app.server!.url.origin}${config.api.path}`);
  } catch (error) {
    log.error('Failed to start server:' + error);
  }
}

export type App = typeof app;
