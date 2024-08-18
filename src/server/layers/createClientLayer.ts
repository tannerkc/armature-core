import { minify } from '@swc/core';
import { randomUUID } from 'crypto';
import path from 'path';
import { isProduction, log } from '../..';

const transpiler = new Bun.Transpiler({
    loader: 'tsx',
    tsconfig: {
        compilerOptions: {
            jsx: 'react',
            jsxFactory: 'createElement',
            jsxFragmentFactory: 'Fragment',
            jsxImportSource: 'jsx-to-html-runtime',
        }
    }
});

export const createClientLayer = async (c: { request: { url: string | URL; }; }) => {
    const url = new URL(c.request.url);
    const routePath = path.join(process.cwd(), 'src', 'routes', url.pathname);

    const htmlFile = Bun.file('./public/index.html');
    let html: string = await htmlFile.text();

    try {
        const { default: RouteComponent } = await import(routePath);
        // const { createElement: jsxDEV, appendChild, Fragment } = await import('../../jsx/jsx-runtime');
        const { jsxDEV } = await import('jsx-to-html-runtime');

        const routeFile = Bun.file(routePath + "/index.tsx")
        const componentCode = await routeFile.text()

        const randomId = randomUUID();

        const imports = transpiler.scanImports(componentCode);

        const hmrCode = `
            if (import.meta.hot) {
                import.meta.hot.accept((newModule) => {
                    if (newModule) {
                        renderApp();
                    }
                });
            }
        `;

        const appContent = `
        <script type="module">

            (async () => {
                // const { createElement, appendChild, Fragment } = await import('../../jsx/jsx-runtime');
                // const { default: RouteComponent } = await import('./src/routes${url.pathname}'); // TODO: create more in-depth file-system router
                const jsxDEV = ${jsxDEV}
                const RouteComponent = ${RouteComponent}

                const renderComponent = async (Component, props = {}) => {
                    if (typeof Component === 'function') {
                        return Component(props);
                    }
                    return Component;
                };

                const renderApp = async () => {
                    try {
                        const element = await renderComponent(RouteComponent);
                        const appContainer = document.querySelector('div[app]');
                        if (appContainer) {
                            appContainer.innerHTML = '';
                            appContainer.appendChild(element);
                        } else {
                            console.error('App container not found');
                        }
                    } catch (error) {
                        console.error('Error rendering component:', error);
                    }
                };

                document.addEventListener("DOMContentLoaded", renderApp);

                window.addEventListener('error', (event) => {
                    console.error('Global error caught:', event.error);
                    const appContainer = document.querySelector('div[app]');
                    if (appContainer) {
                        appContainer.innerHTML = '<p>An error occurred. Please try refreshing the page.</p>';
                    }
                });

                ${hmrCode}
            })();
        </script>
        `;

        const minifiedAppContent = process.env.NODE_ENV === 'production'
            ? (await minify(appContent)).code
            : appContent;

        html = html.replace('<!-- injection point -->', minifiedAppContent);

        const headers = {
            'Content-Type': 'text/html',
        };

        if (process.env.NODE_ENV === 'production') {
            (headers as any)['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline';";
        }

        return new Response(html, { headers });
    } catch (e: any) {
        log.error('Error handling route:\n'+ e);
        if (!isProduction) {
            // vite.ssrFixStacktrace(e);
        }
        return new Response('Not Found', { status: 404 });
    }
};
