import { type Plugin } from 'vite';
import * as swc from '@swc/core';

export default function swcPlugin(): Plugin {
  return {
    name: 'vite-plugin-swc',
    enforce: 'pre',
    async transform(code: string, id: string) {
      // Handle CSS files
      if (id.endsWith('.css')) {
        const cssFile = await Bun.file(id);
        const cssContent = await cssFile.text();
        return {
          code: cssContent,
          map: null
        };
      }

      // Only process JavaScript and TypeScript files
      if (!/\.(t|j)sx?$/.test(id)) return null;

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
      const enhancedCode = `${code}\n${hmrCode}`;
      const isTypeScript = id.endsWith('.ts') || id.endsWith('.tsx');
      const syntax = isTypeScript ? 'typescript' : 'ecmascript';
      const isTSX = id.endsWith('.tsx');

      // Transform the code using SWC
      const result = await swc.transform(enhancedCode, {
        filename: id,
        jsc: {
          parser: {
            syntax: syntax,
            tsx: isTSX,
            jsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
              importSource: 'framework',
              pragma: 'createElement',
              pragmaFrag: 'Fragment',
              throwIfNamespace: true,
              development: false,
              useBuiltins: false
            }
          }
        }
      });

      return {
        code: result.code,
        map: result.map
      };
    }
  };
}
