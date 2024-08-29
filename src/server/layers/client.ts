import { isProduction, log } from "../../index";
import { existsSync } from "fs";
import { appendFile, readdir } from 'node:fs/promises';
import { join, normalize, relative, dirname } from "path";
import { minifySync } from "@swc/core";
import debug from "../../utils/debug";
import { hashFilePath } from "../../utils/crypto";
import { findMatchingRoute } from "../handlers/routeHandler";
import { handleBuildOutputs } from "../handlers/jsContentHandler";

const routeCache = new Map<string, { filePath: string | null; params: Record<string, string>; layout: string | null } | null>();
const buildCache = new Map<string, any>();

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

const renderInitialHTML = async (Component: any, params: any) => {
  if (Component.renderInitial) {
    return await Component.renderInitial(params);
  }
  return '<div>Loading...</div>';
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

    console.log(routeInfo.layout)
 
    let js;
    let routeJs, layoutJs;
    try {
      if (buildCache.has(routeInfo.filePath)) {
        routeJs = buildCache.get(routeInfo.filePath);
      } else {
        routeJs = await Bun.build({
          entrypoints: [routeInfo.filePath],
          minify: true,
          outdir: compilePath,
          splitting: true,
          plugins: getPlugins(),
        });
        // buildCache.set(routeInfo.filePath, js);
      }

      if (routeInfo.layout) {
        if (buildCache.has(routeInfo.layout)) {
          layoutJs = buildCache.get(routeInfo.layout);
        } else {
          layoutJs = await Bun.build({
            entrypoints: [routeInfo.layout],
            minify: true,
            outdir: join(compilePath, 'layout'),
            splitting: true,
            plugins: getPlugins(),
          });
          // buildCache.set(routeInfo.layout, layoutJs);
        }
      }
    } catch (error: any) {
      log.error('Build error:' + error);
      return new Response('Build failed', { status: 500 });
    }
    
    if ((routeJs && !routeJs.success) || (layoutJs && !layoutJs.success)) {
      log.error(routeJs);
      if (layoutJs) log.error(layoutJs);
      return new Response('Build error', { status: 500 });
    }
    
    let {
      cssContent: routeCssContent,
      jsContent: routeJsContent,
      componentName: routeComponentName,
      componentId: routeComponentId,
      jsPath: routeJsPath,
      buildPath
    } = await handleBuildOutputs(routeJs.outputs)

    let {
      cssContent: layoutCssContent,
      jsContent: layoutJsContent,
      componentName: layoutComponentName,
      componentId: layoutComponentId,
      jsPath: layoutJsPath
    } = await handleBuildOutputs(layoutJs.outputs)

    let hydrateScript = `
      const container = document.querySelector('div[app]');
      const params = ${JSON.stringify(routeInfo.params)};
      const componentId = "${routeComponentId}";

      const hydrate = async (RouteComponent, container, params, componentId, LayoutComponent) => {
        if (container) {
          let componentElement;
          // if (LayoutComponent) {
          //   const routeElement = await RouteComponent(params);
          //   componentElement = await LayoutComponent({ children: routeElement.string });
          // } else {
          //   componentElement = await RouteComponent(params);
          // }
          componentElement = await RouteComponent(params);

          const componentHtml = componentElement.string;

          const div = document.createElement('div');
          div.innerHTML = componentHtml;
          div.dataset.params = params;

          div.firstElementChild?.setAttribute('data-c-arm-id', componentId);

          const oldComponent = container.querySelector(\`[data-c-arm-id="\${componentId}"]\`);
          if (oldComponent) {
            container.replaceChild(div.firstElementChild, oldComponent);
          } else {
            container.appendChild(div.firstElementChild);
          }
        }
      }

      const ${layoutComponentName} = (await import("${layoutJsPath}")).default;

      const LayoutComponent = ${layoutComponentName ? `(await import("${layoutJsPath}")).default` : 'null'};

      const Layout = ${layoutComponentName};

      hydrate(${routeComponentName}, container, params, componentId, LayoutComponent);
    `.trim();
    hydrateScript = minifySync(hydrateScript).code;

    let windowErrorScript = `
      window.addEventListener('error', (event) => {
        console.error('Global error caught:', event.error);
        const appContainer = document.querySelector('div[app]');
        if (appContainer) {
          appContainer.innerHTML = event.error;
          appContainer.innerHTML += '<p>An error occurred. Please try refreshing the page.</p>';
        }
      });
    `;
    windowErrorScript = minifySync(windowErrorScript).code;

    let additionalJsContent = hydrateScript + windowErrorScript;

    await appendFile(buildPath, additionalJsContent);

    return streamResponse(htmlStart, routeCssContent + layoutCssContent, routeJsPath, htmlEnd);
  } catch (error: any) {
    log.error('Unhandled error:' + error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
