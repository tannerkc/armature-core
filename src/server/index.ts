import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { createServer as createViteServer } from 'vite';
import swcPlugin from '../../plugins/vite-swc-plugin';
import fs from 'fs/promises';
import path from 'path';
import type { BunFile } from 'bun';
import { isDirectory, isFile } from '../utils/fs'
import { createStaticMiddleware } from './staticMiddleware';
import { watchCSS } from './cssWatcher';
import { createApiLayer } from './createApiLayer';

async function createServer() {
  const app = new Elysia();

//   app.use(staticPlugin({
//     assets: 'example/public',
//     // prefix: '/'
//   }));

// TODO: remove example
  const publicFolder = path.join(process.cwd(), 'example', 'public')

  const staticPlugin = createStaticMiddleware(publicFolder)

  let lastCSSUpdateTime = Date.now();
  watchCSS(publicFolder, () => {
    lastCSSUpdateTime = Date.now();
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [swcPlugin()]
  });

  // TODO: fix middlewares

  

  app.use(vite as any);

  // API routes
//   app.get('/api/*', async (c) => {
//     const url = new URL(c.request.url);
//     const apiPath = path.join(process.cwd(), 'src', 'api', url.pathname.slice(5));
    
//     try {
//       const apiModule = await import(apiPath);
//       if (apiModule.default) {
//         return apiModule.default(c);
//       }
//       return new Response('API route not found', { status: 404 });
//     } catch (error) {
//       console.error('API Error:', error);
//       return new Response('Internal Server Error', { status: 500 });
//     }
//   });

  const apiApp = createApiLayer(path.join(process.cwd(), 'example','src', 'api'));
  app.use(apiApp);

  // Client-side routes
  app.get('*', async (c) => {
    const url = new URL(c.request.url);
    let htmlFile: BunFile = await Bun.file('./example/public/index.html');
    let html: string = await htmlFile.text();

    try {
      // TODO: implement custom HMR

      // TODO: remove example
      let routePath = path.join(process.cwd(), 'example','src', 'routes', url.pathname);

      const { default: RouteComponent } = await import(routePath);
      const { createElement: jsxDEV, appendChild, Fragment } = await import('../jsx/jsx-runtime')
      
      const appContent = `<script type="module">
        const jsxDEV = ${jsxDEV}
        ${appendChild}
        ${Fragment}
        document.addEventListener("DOMContentLoaded", async (event) => {
            const element = ${RouteComponent}()
            document.querySelector('div[app]').append(element)
        });
      </script>`;

      html = html.replace('<!-- injection point -->', appContent);

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (e: any) {
      console.error(e);
      vite.ssrFixStacktrace(e);
      return new Response('Internal Server Error', { status: 500 });
    }
  }, {
    beforeHandle: staticPlugin
  });

  app.listen(3000);
  console.log('App running at http://localhost:3000');
}

createServer();
