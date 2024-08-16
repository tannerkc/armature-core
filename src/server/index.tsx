import { Elysia } from 'elysia';
import path, { join } from 'path';
import fs from 'fs/promises'
import { createStaticMiddleware } from './middleware/staticMiddleware';
import { watchCSS } from './utils/cssWatcher';
import type { IncomingMessage, ServerResponse } from 'http';
import { createClientLayer } from './layers/createClientLayer';
import { log } from '..';
import {html} from '@elysiajs/html';
import { renderJSX, RenderedNode } from 'jsx-to-html-runtime';

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

  app.get('*', async (c) => {
    try {
      const url = new URL(c.request.url);

      const htmlFile = Bun.file('./example/public/index.html');
      let html: string = await htmlFile.text();

      const clientPath = join(import.meta.dir, 'layers', 'client.ts')
      const clientFile = Bun.file(clientPath);
      let client: string = await clientFile.text();
  
      const routePath = path.join(process.cwd(), 'example', 'src', 'routes', url.pathname)
      const { default: RouteComponent } = await import(routePath);

      const compilePath = path.join(process.cwd(), 'example', '.armature', 'routes', url.pathname)

      const injectedClientCode = client
      .replace('/* INJECT_COMPONENT */', `import RouteComponent from '${routePath}';`)
      .replace('/* INJECT_RENDER */', `hydrate(RouteComponent, document.querySelector('div[app]'));`);
  
      const tempClientPath = join(process.cwd(), 'example', '.armature', '.temp', 'client.ts')
      await Bun.write(tempClientPath, injectedClientCode)

      const js = await Bun.build({
        entrypoints: [tempClientPath],
        minify: true,
        outdir: compilePath,
        splitting: true,
        sourcemap: 'linked',
      });

      if(!js.success) return new Response('Not Found', { status: 404 })
    
      const result = await js.outputs[0].text();
  
      for (const output of js.outputs) {
        if (output.kind === "entry-point") {
          const finalHtml = html
          .replace('</body>', `<script>${result}</script><script>
            window.addEventListener('error', (event) => {
              console.error('Global error caught:', event.error);
              const appContainer = document.querySelector('div[app]');
              if (appContainer) {
                appContainer.innerHTML = '<p>An error occurred. Please try refreshing the page.</p>';
              }
            });
          </script></body>`);
      
          return new Response(finalHtml, {
            headers: { 'Content-Type': 'text/html' }
          });
        } else {
          const result = await output.text()
          return new Response(Bun.file(output.path))
        }
      }
    } catch (error: any) {
      log.error(error.message)
    }
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

createServer();
export type App = typeof app;
