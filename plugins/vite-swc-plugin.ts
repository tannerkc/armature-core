import { type Plugin } from 'vite';
import * as swc from '@swc/core';

import swcJsxPlugin from './swc-jsx-plugin';

export default function swcPlugin(): Plugin {
  return {
    name: 'vite-plugin-swc',
    enforce: 'pre',
    async transform(code: string, id: string) {
      if (!/\.(t|j)sx?$/.test(id)) return null;

    // Inject JSX runtime import
    const jsxRuntimeImport = `import { createElement, Fragment } from '/src/jsx-runtime';`;

    // Inject HMR code
    const hmrCode = `
        if (import.meta.hot) {
        import.meta.hot.accept((newModule) => {
            if (newModule) {
            // Re-render the component
            const appElement = document.getElementById('app');
            if (appElement) {
                appElement.innerHTML = '';
                appElement.appendChild(newModule.default());
            }
            }
        });
        }
    `;

    // Combine the original code with our injections
    const enhancedCode = `${jsxRuntimeImport}\n${code}\n${hmrCode}`;

      const result = await swc.transform(enhancedCode, {
        filename: id,
        jsc: {
          parser: {
            syntax: id.endsWith('tsx') ? 'typescript' : 'ecmascript',
            tsx: id.endsWith('tsx'),
            jsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
              pragma: 'createElement',
              pragmaFrag: 'Fragment',
              throwIfNamespace: true,
              development: false,
              useBuiltins: false
            }
          }
        },
        // plugin: swcJsxPlugin
      });

      return {
        code: result.code,
        map: result.map
      };
    }
  };
}
