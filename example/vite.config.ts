import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import Reactive from 'framework'`
  },
  css: {
    // This will make Vite process CSS files
    postcss: {},
  },
});
