import { createElement, appendChild } from '../jsx/jsx-runtime';

export async function render(url: string) {
  try {
    const { default: App } = await import('../../src/routes' + url);
    const app = createElement(App, {});
    return app.outerHTML;
  } catch (error) {
    console.log(error) 
  }
}

// if (!import.meta.env.SSR) {
//   document.addEventListener('DOMContentLoaded', async () => {
//     const { default: App } = await import('./routes' + window.location.pathname);
//     const app = createElement(App, {});
//     document.getElementById('app').appendChild(app);
//   });
// }
