import { log } from "../../index";
import { existsSync } from "fs";
import { appendFile } from 'node:fs/promises';
import { join } from "path";
import clientPlugin from "../plugins/clientPlugin";
import sveltePlugin from "../plugins/sveltePlugin";
import { minifySync } from "@swc/core";

const publicFolder = join(process.cwd(), 'public')
const apiDir = join(process.cwd(), 'src', 'api');
const configPath = join(process.cwd(), 'app.config.ts');
const configImport = existsSync(configPath) && await import(configPath)
const config = configImport?.default;

export const handleClientRequest = async (c: any) => {
  try {
    const url = new URL(c.request.url);
    if (config?.debug?.logs) log.debug(`Attempting to serve route: ${url.pathname}`);
    if (config?.debug?.logs) log.debug(c.request.url)
    if (config?.debug?.logs) log.debug(process.cwd())
  
    const htmlFile = Bun.file('./public/index.html');
    let html: string = await htmlFile.text();
    
    let routePath = join(process.cwd(), 'src', 'routes', url.pathname, 'index.tsx');
    if (!existsSync(routePath)) {
      routePath = join(process.cwd(), 'src', 'routes', `${url.pathname}.tsx`);
    }
    
    if (config?.debug?.logs) log.debug(`Attempting to import route from: ${routePath}`);
  
    if (!existsSync(routePath)) {
      if (config?.debug?.logs) log.debug(`Route file not found: ${routePath}`);
      return new Response('Not Found', { status: 404 });
    }

    const compilePath = join(process.cwd(), '.armature', 'routes', url.pathname);
      
    const js = await Bun.build({
      entrypoints: [routePath],
      minify: true,
      outdir: compilePath,
      splitting: true,
      plugins: [
        sveltePlugin
      ],
    });
    
    if (!js.success) {
      log.error(js)
      return new Response('Build error', { status: 404 })
    };
    
    let cssContent = '';
    let jsContent = '';

    // const pathParts = routePath.split('/')
    // const componentName = pathParts[pathParts.length -2]

    for (const output of js.outputs) {
      if (output.kind === "entry-point") {
        jsContent = await output.text();

        const regex = /export\{([a-zA-Z]{2})\s+as\s+default\};/;
        const match = jsContent.match(regex);
        const componentName = match?.[1];
  
        let hydrateScript = `
        function hydrate(element, container) {
          if (container) {
              container.innerHTML = element().string;
          }
        }
        hydrate(${componentName}, document.querySelector('div[app]'))
        `.trim();
        hydrateScript = minifySync(hydrateScript).code

        jsContent += hydrateScript
        await appendFile(output.path, hydrateScript)
      } else if (output.path.endsWith('.css')) {
        cssContent += await output.text();
      }
    }

    let windowErrorScript = `window.addEventListener('error', (event) => {
          console.error('Global error caught:', event.error);
          const appContainer = document.querySelector('div[app]');
          if (appContainer) {
            appContainer.innerHTML = event.error;
            appContainer.innerHTML += '<p>An error occurred. Please try refreshing the page.</p>';
          }
        });`;
    windowErrorScript = minifySync(windowErrorScript).code
    
    const finalHtml = html
      .replace('</head>', `<style>${cssContent}</style></head>`)
      .replace('</body>', `<script type="module">${jsContent}</script><script>
        ${windowErrorScript}
      </script></body>`);

      // const { default: route_default } = await import(compilePath);
      // route_default().string
    
    return new Response(finalHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: any) {
    log.error(error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
