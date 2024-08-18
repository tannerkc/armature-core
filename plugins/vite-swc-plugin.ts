import { type Plugin } from 'vite';
import * as swc from '@swc/core';
import { edenTreaty, edenFetch } from '@elysiajs/eden';
import type { App } from '../src/server';
import path from 'path';

export default function swcPlugin(): Plugin {
  let appConfig: any;
  return {
    name: 'vite-plugin-swc',
    configureServer(server) {
      const configPath = path.join(process.cwd(), 'app.config.ts');
      appConfig = require(configPath).default;
    },
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

      // Inject Eden objects 
      const injectEdenObjects = `
        window.__APP_CONFIG__ = ${JSON.stringify(appConfig)};
        window.server = ${edenTreaty(appConfig.server.url)};
        window.serverFetch = ${edenFetch(appConfig.server.url)};
      `;

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
      const enhancedCode = `${injectEdenObjects}\n${code}\n${hmrCode}`;
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
