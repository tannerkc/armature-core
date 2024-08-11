import { minify } from '@swc/core';
import type { BunFile } from 'bun';
import { randomUUID } from 'crypto';
import path from 'path';
import { isProduction, log, vite } from '../..';

export const createClientLayer = async (c: { request: { url: string | URL; }; }) => {
    const url = new URL(c.request.url);
    const routePath = path.join(process.cwd(), 'example', 'src', 'routes', url.pathname); // TODO: remove example

    const htmlFile: BunFile = await Bun.file('./example/public/index.html');
    let html: string = await htmlFile.text();

    try {
        const { default: RouteComponent } = await import(routePath);
        const { createElement: jsxDEV, appendChild, Fragment } = await import('../../jsx/jsx-runtime');

        // Stringify functions to prevent XSS
        const stringifiedJsxDEV = jsxDEV.toString();
        const stringifiedAppendChild = appendChild.toString();
        const stringifiedFragment = Fragment.toString();
        const stringifiedRouteComponent = RouteComponent.toString();

        const randomId = randomUUID()

        // Inject HMR code
        const hmrCode = `
            if (import.meta.hot) {
                import.meta.hot.accept((newModule) => {
                if (newModule) {
                    // Re-render the component
                    const appElement = document.getElementById('${randomId}');
                    if (appElement) {
                        appElement.innerHTML = '';
                        appElement.appendChild(newModule.default());
                    }
                }
                });
            }
        `;

        const appContent = `
        <script type="module">
            (async () => {
            ${stringifiedRouteComponent}
            const jsxDEV = ${stringifiedJsxDEV};
            const appendChild = ${stringifiedAppendChild};
            const Fragment = ${stringifiedFragment};
            const RouteComponent = ${stringifiedRouteComponent};

            document.addEventListener("DOMContentLoaded", async (event) => {
                try {
                const element = await RouteComponent();
                const appContainer = document.querySelector('div[app]');
                if (appContainer) {
                    appContainer.innerHTML = ''; // Clear existing content
                    appContainer.append(element);
                } else {
                    console.error('App container not found');
                }
                } catch (error) {
                console.error('Error rendering component:', error);
                }
            });

            // Basic error boundary
            window.addEventListener('error', (event) => {
                console.error('Global error caught:', event.error);
                const appContainer = document.querySelector('div[app]');
                if (appContainer) {
                appContainer.innerHTML = '<p>An error occurred. Please try refreshing the page.</p>';
                }
            });
            })();
            ${hmrCode}
        </script>
        `;

      // Combine the original code with our injections
    //   const enhancedCode = `${injectEdenObjects}\n${appContent}\n${hmrCode}`;

      // Minify the appContent in production
        const minifiedAppContent = process.env.NODE_ENV === 'production'
            ? (await minify(appContent)).code
            : appContent;

        html = html.replace('<!-- injection point -->', minifiedAppContent);

        // Add CSP header in production
        const headers = {
            'Content-Type': 'text/html',
        };

        if (process.env.NODE_ENV === 'production') {
            headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline';";
        }

        return new Response(html, { headers });
    } catch (e: any) {
        log.error('Error handling route:', e);
        if (!isProduction) {
            vite.ssrFixStacktrace(e);
        }
        // TODO: better error handling for devs + configurable 404 page
        return new Response('Not Found', { status: 404 });
    }
}
