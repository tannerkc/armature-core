import { Elysia } from 'elysia';
import { createServer as createViteServer } from 'vite';
import swcPlugin from '../../plugins/vite-swc-plugin';
import fs from 'fs/promises';
import path from 'path';
import type { BunFile } from 'bun';

async function createServer() {
  const app = new Elysia();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [swcPlugin()]
  });

  // TODO: fix middlewares

//   app.use(vite.middlewares as any);

  // API routes
  app.get('/api/*', async (c) => {
    const url = new URL(c.request.url);
    const apiPath = path.join(process.cwd(), 'src', 'api', url.pathname.slice(5));
    
    try {
      const apiModule = await import(apiPath);
      if (apiModule.default) {
        return apiModule.default(c);
      }
      return new Response('API route not found', { status: 404 });
    } catch (error) {
      console.error('API Error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  // Client-side routes
  app.get('*', async (c) => {
    const url = new URL(c.request.url);
    let htmlFile: BunFile = await Bun.file('./example/public/index.html');
    let html: string = await htmlFile.text();

    try {
      // Transform and inject Vite HMR client
    //   html = await vite.transformIndexHtml(url.pathname, html);
    //   console.log(html)

      // Determine the route file path

      // TODO: remove example
      let importPath = path.join(process.cwd(), 'dist','src');
      let routePath = path.join(process.cwd(), 'example','src', 'routes', url.pathname);
      console.log(routePath)
      if (routePath.endsWith('/')) {
        routePath += 'index.tsx';
      } else if (!routePath.endsWith('.tsx')) {
        return
      }
      
      // Check if the file exists, if not, try page.tsx
    //   try {
    //     await fs.access(routePath);
    //   } catch {
    //     routePath = path.join(path.dirname(routePath), 'page.tsx');
    //   }

      // Import and render the route component
    //   const { default: RouteComponent } = await vite.ssrLoadModule(routePath);
      const { default: RouteComponent } = await import(routePath);
      const { createElement: jsxDev, appendChild, Fragment } = await import('../jsx/jsx-runtime')
      
      const appContent = `<script type="module">
        const jsxDEV = ${jsxDev}
        const appendChild = ${appendChild}
        const Fragment = ${Fragment}
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
  });

  app.listen(3000);
  console.log('App running at http://localhost:3000');
}

createServer();
