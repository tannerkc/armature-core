import { createElement, appendChild } from '../jsx/jsx-runtime';

export async function render(url: string) {
  const { default: App } = await import('./routes' + url);
  const app = createElement(App, {});
  return app.outerHTML;
}

if (!import.meta.env.SSR) {
  document.addEventListener('DOMContentLoaded', async () => {
    const { default: App } = await import('./routes' + window.location.pathname);
    const app = createElement(App, {});
    document.getElementById('app').appendChild(app);
  });
}
