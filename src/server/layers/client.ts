import { renderJSX, RenderedNode } from 'jsx-to-html-runtime';
import App from '../../../example/src/routes/index';

function hydrate(element: RenderedNode, container: HTMLElement | null) {
  if (container) {
    container.innerHTML = element.string;
  }
}

const appElement = renderJSX(App, {});
hydrate(appElement, document.querySelector('div[app]'));
