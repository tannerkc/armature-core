import { Elysia } from 'elysia';
import { createServer as createViteServer } from 'vite';
import swcPlugin from '../../plugins/vite-swc-plugin';
import path from 'path';
import type { BunFile } from 'bun';
import fs from 'fs/promises'
import { createStaticMiddleware } from './utils/staticMiddleware';
import { watchCSS } from './utils/cssWatcher';
import { minify } from '@swc/core';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

const isProduction = process.env.NODE_ENV === 'production'

// TODO: remove example
const publicFolder = path.join(process.cwd(), 'example', 'public')
const apiDir = path.join(process.cwd(), 'example', 'src', 'api');
const configPath = path.join(process.cwd(), 'example', 'app.config.ts');
const config = await import(configPath);

const app = new Elysia();
async function createServer() {
  const staticPlugin = createStaticMiddleware(publicFolder)

  let lastCSSUpdateTime = Date.now();
  watchCSS(publicFolder, () => {
    lastCSSUpdateTime = Date.now();
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [swcPlugin()]
  })

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
  app.get('*', async (c) => {
    const url = new URL(c.request.url);
    const routePath = path.join(process.cwd(), 'example', 'src', 'routes', url.pathname); // TODO: remove example

    const htmlFile: BunFile = await Bun.file('./example/public/index.html');
    let html: string = await htmlFile.text();

    try {
      const { default: RouteComponent } = await import(routePath);
      const { createElement: jsxDEV, appendChild, Fragment } = await import('../jsx/jsx-runtime');

      // Stringify functions to prevent XSS
      const stringifiedJsxDEV = jsxDEV.toString();
      const stringifiedAppendChild = appendChild.toString();
      const stringifiedFragment = Fragment.toString();
      const stringifiedRouteComponent = RouteComponent.toString();

      // TODO: implement global method for edenTreaty and edenFetch - possible lifecycle methods too

        // Inject Eden objects 
        // const injectEdenObjects = `
        // window.__APP_CONFIG__ = ${JSON.stringify(config.default)};
        // window.server = ${edenTreaty}(window.__APP_CONFIG__.server.url);
        // window.serverFetch = (${edenFetch})(window.__APP_CONFIG__.server.url);
        // `;
        const randomId = randomUUID()

        // Inject HMR code
        const hmrCode = `
            if (import.meta.hot) {
                import.meta.hot.accept((newModule) => {
                if (newModule) {
                    // Re-render the component
                    const appElement = document.getElementById('${randomId}');
                    if (appElement) {
                        appElement.innerHTML = '';
                        appElement.appendChild(newModule.default());
                    }
                }
                });
            }
        `;

      const appContent = `
        <script type="module">
          (async () => {
            ${stringifiedRouteComponent}
            const jsxDEV = ${stringifiedJsxDEV};
            const appendChild = ${stringifiedAppendChild};
            const Fragment = ${stringifiedFragment};
            const RouteComponent = ${stringifiedRouteComponent};

            document.addEventListener("DOMContentLoaded", async (event) => {
              try {
                const element = await RouteComponent();
                const appContainer = document.querySelector('div[app]');
                if (appContainer) {
                  appContainer.innerHTML = ''; // Clear existing content
                  appContainer.append(element);
                } else {
                  console.error('App container not found');
                }
              } catch (error) {
                console.error('Error rendering component:', error);
              }
            });

            // Basic error boundary
            window.addEventListener('error', (event) => {
              console.error('Global error caught:', event.error);
              const appContainer = document.querySelector('div[app]');
              if (appContainer) {
                appContainer.innerHTML = '<p>An error occurred. Please try refreshing the page.</p>';
              }
            });
          })();
          ${hmrCode}
        </script>
      `;

      // Combine the original code with our injections
    //   const enhancedCode = `${injectEdenObjects}\n${appContent}\n${hmrCode}`;

      // Minify the appContent in production
      const minifiedAppContent = process.env.NODE_ENV === 'production'
        ? (await minify(appContent)).code
        : appContent;

      html = html.replace('<!-- injection point -->', minifiedAppContent);

      // Add CSP header in production
      const headers = {
        'Content-Type': 'text/html',
      };
      if (process.env.NODE_ENV === 'production') {
        headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline';";
      }

      return new Response(html, { headers });
    } catch (e: any) {
      console.error('Error handling route:', e);
      vite.ssrFixStacktrace(e);
        // TODO: better error handling for devs + configurable 404 page
      return new Response('Not Found', { status: 404 });
    }
  }, {
    beforeHandle: staticPlugin
  });

  // Client-side routes
//   app.get('*', async (c) => {
//     const url = new URL(c.request.url);
//     let htmlFile: BunFile = await Bun.file('./example/public/index.html');
//     let html: string = await htmlFile.text();

//     try {
//       // TODO: implement custom HMR

//       // TODO: remove example
//       let routePath = path.join(process.cwd(), 'example','src', 'routes', url.pathname);

//       const { default: RouteComponent } = await import(routePath);
//       const { createElement: jsxDEV, appendChild, Fragment } = await import('../jsx/jsx-runtime')
      
//       const appContent = `<script type="module">
//         const jsxDEV = ${jsxDEV}
//         ${appendChild}
//         ${Fragment}
//         document.addEventListener("DOMContentLoaded", async (event) => {
//             const element = ${RouteComponent}()
//             document.querySelector('div[app]').append(element)
//         });
//       </script>`;

//       html = html.replace('<!-- injection point -->', appContent);

//       return new Response(html, {
//         headers: { 'Content-Type': 'text/html' },
//       });
//     } catch (e: any) {
//       console.error(e);
//       vite.ssrFixStacktrace(e);
//       return new Response('Internal Server Error', { status: 500 });
//     }
//   }, {
//     beforeHandle: staticPlugin
//   });

  const port = new URL(config.default.server.url).port || 3000;
  app.listen(port);

  console.log(`App running at ${config.default.server.url}`);
}

createServer();
export type App = typeof app;
