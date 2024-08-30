import { isProduction, log } from "../../index";
import debug from "../../utils/debug";
import { findMatchingRoute } from "../handlers/routeHandler";
import { buildManager } from "../managers/buildManager";
import type { RouteInfo } from "../../types";

const streamResponse = (htmlStart: string, cssContent: string, jsRoute: string, htmlEnd: string) => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(htmlStart);
      controller.enqueue(`<style>${cssContent}</style>`);
      controller.enqueue(htmlEnd);
      controller.enqueue(`<script src="${jsRoute}" type="module"></script>`);
      controller.enqueue(`<script src="/.armature/window.js" type="module"></script>`);
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

    let routeInfo: RouteInfo;
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

    const {
      cssContent,
      routeJsPath
    } = await buildManager.handleRouteInfo(routeInfo, url.pathname)

    return streamResponse(htmlStart, cssContent, routeJsPath, htmlEnd);
  } catch (error: any) {
    log.error('Unhandled error:' + error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
