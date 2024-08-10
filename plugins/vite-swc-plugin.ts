import { type Plugin } from 'vite';
import * as swc from '@swc/core';

import swcJsxPlugin from './swc-jsx-plugin';

export default function swcPlugin(): Plugin {
  return {
    name: 'vite-plugin-swc',
    enforce: 'pre',
    async transform(code: string, id: string) {
      if (!/\.(t|j)sx?$/.test(id)) return null;

      const result = await swc.transform(code, {
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
