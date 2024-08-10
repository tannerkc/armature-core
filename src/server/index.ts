import { Elysia } from 'elysia';
import { createServer as createViteServer } from 'vite';
import swcPlugin from '../../plugins/vite-swc-plugin';

async function createServer() {
  const app = new Elysia();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [swcPlugin()]
  });

//   app.use(vite.middlewares as any);

  app.get('*', async (c) => {
    // console.log(c)
    try {
      const url = new URL(c.request.url);
      let html = await Bun.file('./example/public/index.html').text();
      html = await vite.transformIndexHtml(url.pathname, html);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (e) {
      console.error(e);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  app.listen(3000);
  console.log('App running at http://localhost:3000');
}

createServer();
