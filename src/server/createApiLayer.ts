import { Elysia } from 'elysia';
import fs from 'fs';
import path from 'path';

export function createApiLayer(apiDir: string) {
  const app: any = new Elysia();

  // Read all files in the API directory
  fs.readdirSync(apiDir).forEach(file => {
    const routePath = `/${file.replace('.ts', '')}`;
    const modulePath = path.join(apiDir, file);

    // Dynamically import the module
    const apiModule = require(modulePath);

    // Register handlers for each HTTP method
    Object.keys(apiModule).forEach(method => {
      const handler = apiModule[method];
      if (typeof handler === 'function') {
        app[method.toLowerCase()](routePath, async (context: any) => {
          try {
            return await handler(context);
          } catch (error) {
            console.error(`Error handling ${method} ${routePath}:`, error);
            return new Response('Internal Server Error', { status: 500 });
          }
        });
      }
    });
  });

  return app;
}
