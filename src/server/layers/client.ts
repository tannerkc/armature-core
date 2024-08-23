import { isProduction, log } from "../../index";
import { existsSync } from "fs";
import { appendFile, readdir } from 'node:fs/promises';
import { join, normalize, relative, dirname } from "path";
import { minifySync } from "@swc/core";
import debug from "../../utils/debug";
import { hashFilePath } from "../../utils/crypto";

const routeCache = new Map<string, { filePath: string | null; params: Record<string, string>; layout: string | null } | null>();
const buildCache = new Map<string, any>();

const findMatchingRoute = async (urlPath: string): Promise<{ filePath: string | null, params: Record<string, string>, layout: string | null }> => {
  debug(`Finding matching Route for path: ${urlPath}`)
  
  // if (routeCache.has(urlPath)) {
  //   return routeCache.get(urlPath)!;
  // }

  const parts = urlPath.split('/').filter(Boolean);
  let currentPath = normalize(join(process.cwd(), 'src', 'routes'));
  let params: Record<string, string> = {};
  let layout: string | null = null;

  if (parts.length === 0) {
    const indexPath = join(currentPath, 'index.tsx');
    if (existsSync(indexPath)) {
      const result = { filePath: indexPath, params, layout: null };
      routeCache.set(urlPath, result);
      return result;
    }
    const result = { filePath: null, params, layout: null };
    routeCache.set(urlPath, result);
    return result;
  }

  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const segment = parts[i];

    let possiblePath = normalize(join(currentPath, segment));
    if (isLast) {
      if (existsSync(`${possiblePath}.tsx`)) {
        const hasLocalLayout = await existsSync(join(dirname(possiblePath), 'layout.tsx'));
        const result = { filePath: `${possiblePath}.tsx`, params, layout: hasLocalLayout ? join(dirname(possiblePath), 'layout.tsx') : null };
        routeCache.set(urlPath, result);
        return result;
      }
      if (existsSync(join(possiblePath, 'index.tsx'))) {
        const hasLocalLayout = await existsSync(join(possiblePath, 'layout.tsx'));
        const result = { filePath: join(possiblePath, 'index.tsx'), params, layout: hasLocalLayout ? join(possiblePath, 'layout.tsx') : null };
        routeCache.set(urlPath, result);
        return result;
      }
    }
    
    const files = await readdir(currentPath);
    const directories = files.filter(file => !file.includes('.'));
    const dynamicSegment = directories.find(file => file.startsWith('[') && file.endsWith(']'));
    
    if (dynamicSegment && !segment.includes('.')) {
      const paramName = dynamicSegment.slice(1, -1); 
      params[paramName] = segment;
      possiblePath = normalize(join(currentPath, dynamicSegment));
      if (isLast) {
        if (existsSync(`${possiblePath}.tsx`)) {
          const hasLocalLayout = await existsSync(join(dirname(possiblePath), 'layout.tsx'));
          const result = { filePath: `${possiblePath}.tsx`, params, layout: hasLocalLayout ? join(dirname(possiblePath), 'layout.tsx') : null };
          routeCache.set(urlPath, result);
          return result;
        }
        if (existsSync(join(possiblePath, 'index.tsx'))) {
          const hasLocalLayout = await existsSync(join(possiblePath, 'layout.tsx'));
          const result = { filePath: join(possiblePath, 'index.tsx'), params, layout: hasLocalLayout ? join(possiblePath, 'layout.tsx') : null };
          routeCache.set(urlPath, result);
          return result;
        }
      }
      currentPath = possiblePath;
    } else if (existsSync(possiblePath)) {
      currentPath = possiblePath;
    } else {
      const result = { filePath: null, params, layout: null };
      routeCache.set(urlPath, result);
      return result;
    }
  }
  
  const result = { filePath: null, params, layout: null };
  routeCache.set(urlPath, result);
  return result;
};

const getPlugins = () => {
  return [];
};

const streamResponse = (htmlStart: string, cssContent: string, jsContent: string, htmlEnd: string) => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(htmlStart);
      controller.enqueue(`<style>${cssContent}</style>`);
      controller.enqueue(htmlEnd);
      controller.enqueue(`<script src="${jsContent}" type="module"></script>`);
      if (!isProduction) controller.enqueue(`<script src="/.armature/hmr.js" type="module"></script>`);
      controller.close();
    }
  });

  const headers = {
    'Content-Type': 'text/html',
  };

  if (isProduction) {
    (headers as any)['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline';";
  }

  return new Response(stream, { headers });
};

export const handleClientRequest = async (c: any) => {
  try {
    const url = new URL(c.request.url);

    debug(`Attempting to serve route: ${url.pathname}`);
  
    const htmlFile = Bun.file('./public/index.html');
    const htmlContent = await htmlFile.text();
    const [htmlStart, htmlEnd] = htmlContent.split('</head>');

    let routeInfo: { filePath: string | null, params: Record<string, string>, layout: string | null };
    try {
      routeInfo = await findMatchingRoute(url.pathname);
    } catch (error) {
      log.error('Route resolution error:' + error);
      return new Response('Route not found', { status: 404 });
    }

    debug(`Attempting to import route from: ${routeInfo.filePath}`);
  
    if (!routeInfo.filePath) {
      debug(`Route file not found for: ${url.pathname}`);
      return new Response('Not Found', { status: 404 });
    }

    const compilePath = normalize(join(process.cwd(), '.armature', 'routes', url.pathname));
 
    let js;
    try {
      if (buildCache.has(routeInfo.filePath)) {
        js = buildCache.get(routeInfo.filePath);
      } else {
        js = await Bun.build({
          entrypoints: [routeInfo.filePath],
          minify: true,
          outdir: compilePath,
          splitting: true,
          plugins: getPlugins(),
        });
        // buildCache.set(routeInfo.filePath, js);
      }
    } catch (error: any) {
      log.error('Build error:' + error);
      return new Response('Build failed', { status: 500 });
    }
    
    if (!js.success) {
      log.error(js);
      return new Response('Build error', { status: 500 });
    }
    
    let cssContent = '';
    let jsContent = '';

    for (const output of js.outputs) {
      if (output.kind === "entry-point") {
        jsContent = await output.text();

        const regex = /export\s*[\{\(\[]\s*([a-zA-Z0-9_$&]+)\s+as\s+default\s*[\}\)\]]\s*;?/;
        const match = jsContent.match(regex);
        const componentName = match?.[1];

        const componentId = hashFilePath(relative(process.cwd(), output.path))

        let hydrateScript = `
            const container = document.querySelector('div[app]');
            const params = ${JSON.stringify(routeInfo.params)};
            const componentId = "${componentId}";
            const hydrate = async (element, container, params, componentId) => {
              if (container) {
                const component = await element(params);
                const componentHtml = component.string
                const div = document.createElement('div');
                div.innerHTML = componentHtml;
                div.dataset.params = params;
    
                div.firstElementChild.setAttribute('data-c-arm-id', componentId);
    
                const oldComponent = container.querySelector(\`[data-c-arm-id="\${componentId}"]\`);
                if (oldComponent) {
                    container.replaceChild(div.firstElementChild, oldComponent);
                } else {
                    container.appendChild(div.firstElementChild);
                }
              }
            }

            const Layout = ${routeInfo.layout ? `await import("${routeInfo.layout}").then(mod => mod.default)` : 'null'};

            hydrate((params) => Layout ? Layout({ children: ${componentName}(params) }) : ${componentName}(params), container, params, componentId);
        `.trim();
        hydrateScript = minifySync(hydrateScript).code;

        let windowErrorScript = `window.addEventListener('error', (event) => {
          console.error('Global error caught:', event.error);
          const appContainer = document.querySelector('div[app]');
          if (appContainer) {
            appContainer.innerHTML = event.error;
            appContainer.innerHTML += '<p>An error occurred. Please try refreshing the page.</p>';
          }
        });`;
        windowErrorScript = minifySync(windowErrorScript).code;

        let additionalJsContent = hydrateScript + windowErrorScript;

        jsContent = '/' + relative(process.cwd(), output.path)
        await appendFile(output.path, additionalJsContent);
      } else if (output.path.endsWith('.css')) {
        cssContent += await output.text();
      }
    }

    return streamResponse(htmlStart, cssContent, jsContent, htmlEnd);
  } catch (error: any) {
    log.error('Unhandled error:' + error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
