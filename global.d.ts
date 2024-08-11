import { edenTreaty, edenFetch } from '@elysiajs/eden';

// TODO: remove example
declare global {
  interface Window {
    server: typeof edenTreaty<import('./src/server').App>;
    serverFetch: typeof edenFetch<import('./src/server').App>;
    __APP_CONFIG__: typeof import('./example/app.config').default;
  }

  const server: Window['server'];
  const serverFetch: Window['serverFetch'];
  const __APP_CONFIG__: Window['__APP_CONFIG__'];

  const onMount: typeof import('./src/lifecycle/mount').onMount;
}
