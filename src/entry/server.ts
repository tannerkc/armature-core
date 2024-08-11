import { createElement } from '../jsx/jsx-runtime';

export async function render(url: string) {
  const { default: App } = await import('./routes' + url);
  const app = createElement(App, {});
  return app.outerHTML;
}
