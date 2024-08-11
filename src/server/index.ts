import { Elysia } from 'elysia';
import path from 'path';
import fs from 'fs/promises'
import { createStaticMiddleware } from './middleware/staticMiddleware';
import { watchCSS } from './utils/cssWatcher';
import type { IncomingMessage, ServerResponse } from 'http';
import { createClientLayer } from './layers/createClientLayer';
import { log } from '..';

// TODO: remove example
const publicFolder = path.join(process.cwd(), 'example', 'public')
const apiDir = path.join(process.cwd(), 'example', 'src', 'api');
const configPath = path.join(process.cwd(), 'example', 'app.config.ts');
const configImport = await import(configPath)
const config = configImport.default;

const app = new Elysia();
async function createServer() {
  const staticPlugin = createStaticMiddleware(publicFolder)

  let lastCSSUpdateTime = Date.now();
  watchCSS(publicFolder, () => {
    lastCSSUpdateTime = Date.now();
  });

  // Custom middleware to adapt Bun's request to Vite's expected format
  const viteMiddleware = async (c: any) => {
    if (isProduction) return c.next();
    
    const req = c.request as Request;
    console.log(req)
    if(!req?.url) return c.next();


    const url = new URL(req.url);

    // Create a minimal IncomingMessage-like object
    const fakeReq: Partial<IncomingMessage> = {
      url: url.pathname + url.search,
      method: req.method,
      headers: Object.fromEntries(req.headers),
      // Add other properties as needed
    };

    // Create a minimal ServerResponse-like object
    const fakeRes: Partial<ServerResponse> = {
      setHeader: (name: string, value: string | number | readonly string[]) => {
        c.set.headers[name.toLowerCase()] = value;
      },
      end: (chunk: any) => {
        if (chunk) {
          return new Response(chunk, {
            headers: c.set.headers,
            status: c.set.status || 200,
          });
        }
      },
      // Add other methods as needed
    };

    return new Promise((resolve) => {
      vite.middlewares(fakeReq as IncomingMessage, fakeRes as ServerResponse);
    });
  };

  // TODO: fix vite middlewares

    // app.guard({
    //     beforeHandle: async ({request, response, next}) => {
    //         if (request?.url && response) await vite.middlewares(request, response, next);
    //     }
    // })

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


  // API routes
//   app.get('/api/*', async (c) => {
//     const method = c.request.method
//     const url = new URL(c.request.url);
//     const apiPath = path.join(process.cwd(), 'example', 'src', 'api', url.pathname.slice(5));
    
//     try {
//       const apiModule = await import(apiPath);
//       const handler = apiModule[method];
//       return await handler(c);
//     } catch (error) {
//       console.error('API Error:', error);
//       return new Response('Internal Server Error', { status: 500 });
//     }
//   });


  // Client-side routes
//   app.get('*', async ({ request }) => {
//     // const url = new URL(request.url);
//     // let html = await fs.readFile(path.resolve(process.cwd(), 'example', 'index.html'), 'utf-8');

//     const url = new URL(request.url);
//     const routePath = path.join(process.cwd(), 'example', 'src', 'routes', url.pathname); // TODO: remove example

//     const htmlFile: BunFile = await Bun.file('./example/public/index.html');
//     let html: string = await htmlFile.text();

//     if (!isProduction) {
//       // In development, use Vite to transform the HTML
//       html = await vite.transformIndexHtml(url.pathname, html);
//     }

//     try {
//       let template: any = html;
//       let render;

//       if (!isProduction) {
//         // In development, load the server entry module
//         render = (await vite.ssrLoadModule('/src/entry/client.ts')).render;
//       } else {
//         // In production, use the built files
//         // template = await fs.readFile(path.resolve(process.cwd(), 'dist', 'client', 'index.html'), 'utf-8');
//         // render = (await import('./dist/server/entry-server.js')).render;
//       }

//       const appHtml = await render(url.pathname);

//       const finalHtml = template.replace(`<!-- injection point -->`, appHtml);

//       return new Response(finalHtml, {
//         headers: { 'Content-Type': 'text/html' },
//       });
//     } catch (e: any) {
//       if (!isProduction) {
//         vite.ssrFixStacktrace(e);
//       }
//       console.error(e);
//       return new Response('Internal Server Error', { status: 500 });
//     }
//   });

  // Client-side routes
  
  app.get('*', async (c) => {
    return createClientLayer(c)
  }, {
    beforeHandle: staticPlugin
  });

  const port = new URL(config?.server?.url)?.port || 3000;
  app.listen(port);

  log.gen(`App running at ${config?.server?.url}`);
  log.gen(`Happy Developing!`);
}

createServer();
export type App = typeof app;
