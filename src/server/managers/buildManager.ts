import { CONFIG } from '../../config';
import { cacheManager } from './cacheManager';
import { join, normalize, relative } from "path";
import { minifySync } from "@swc/core";
import { appendFile } from 'node:fs/promises';
import { hashFilePath } from "../../utils";
import { isProduction, log } from "../../index";
import type { RouteInfo } from 'src/types';

interface BuildResult {
  success: boolean;
  routeJsPath: string;
  cssContent: string;
  error?: Error;
}

class BuildManager {
    private plugins: any[] = [];
  
    constructor() {
      this.initializePlugins();
    }
  
    private initializePlugins() {
      // Initialize plugins here
      // this.plugins.push(new sveltePlugin());
    }

    async handleRouteInfo(routeInfo: RouteInfo, pathname: string): Promise<BuildResult> {
      try {
        let routeJs = await this.buildPath(routeInfo.filePath, pathname);
        let layoutJs = routeInfo.layout ? await this.buildPath(routeInfo.layout, pathname) : null;

        let {
          cssContent: routeCssContent,
          jsContent: routeJsContent,
          componentName: routeComponentName,
          componentId: routeComponentId,
          jsPath: routeJsPath,
          buildPath
        } = await this.handleBuildOutputs(routeJs.outputs)

        let {
          cssContent: layoutCssContent,
          jsContent: layoutJsContent,
          componentName: layoutComponentName,
          componentId: layoutComponentId,
          jsPath: layoutJsPath
        } = await this.handleBuildOutputs(layoutJs?.outputs);

        const hydrateScript = this.generateHydrateScript({
          routeComponentName,
          layoutComponentName,
          routeComponentId,
          layoutComponentId,
          layoutJsPath,
          routeInfo
        });

        const windowErrorScript = this.generateWindowErrorScript();

        const additionalJsContent = minifySync(hydrateScript + windowErrorScript).code;

        await appendFile(buildPath, additionalJsContent);

        return {
          success: true,
          cssContent: routeCssContent + layoutCssContent,
          routeJsPath
        }
      } catch (error) {
        log.error(`Build error:`+ error);
        return {
          success: false,
          cssContent: '',
          routeJsPath: '',
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }

    async buildPath(filePath: string | null, pathname: string): Promise<any> {
        if (!filePath) return {
            success: false
        }

        try {
          const cachedBuild = cacheManager.getBuildInfo(filePath);
          if (cachedBuild) {
              return cachedBuild;
          }

          const compilePath = normalize(join(CONFIG.BUILD_DIR, pathname));

          const buildResult = await Bun.build({
            entrypoints: [filePath],
            minify: true,
            outdir: compilePath,
            splitting: true,
            plugins: this.plugins,
          });

          if (!buildResult.success) {
            throw new Error(`Build failed for ${filePath}`);
          }

          // cacheManager.setBuildInfo(filePath, buildResult);
          return buildResult;
        } catch (error) {
          log.error(`Build error for ${filePath}:`+ error);
          return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          };
        }
    }

    async handleBuildOutputs(outputs: any[]) {
        const result = {
            cssContent: '',
            jsContent: '',
            componentName: '',
            componentId: '',
            jsPath: '',
            buildPath: ''
        }
    
        if (!outputs) return result
    
        for (const output of outputs) {
            if (output.kind === "entry-point") {
                result.jsContent = await output.text();
    
                const regex = /export\s*[\{\(\[]\s*([a-zA-Z0-9_$&]+)\s+as\s+default\s*[\}\)\]]\s*;?/;
                const match = result.jsContent.match(regex);
                result.componentName = match?.[1] || '';
    
                result.componentId = hashFilePath(relative(process.cwd(), output.path))
                result.jsPath = '/' + relative(process.cwd(), output.path);
                result.buildPath = output.path
            } else if (output.path.endsWith('.css')) {
                result.cssContent += await output.text();
            }
        }
    
        return result
    }

    private generateHydrateScript({
        routeComponentName,
        layoutComponentName,
        routeComponentId,
        layoutComponentId,
        layoutJsPath,
        routeInfo
    } : {
        routeComponentName: string, 
        layoutComponentName: string, 
        routeComponentId: string, 
        layoutComponentId: string, 
        layoutJsPath: string, 
        routeInfo: RouteInfo
    }): string {
      return `
        const container = document.querySelector('div[app]');
        const params = ${JSON.stringify(routeInfo.params)};
        const componentId = "${routeComponentId}";

        const stringToHTML = (str) => {
          const tempContainer = document.createElement('div');
          tempContainer.innerHTML = str;
          return tempContainer.firstChild;
        }
  
        const hydrate = async (RouteComponent, container, params, componentId, LayoutComponent) => {
          if (container) {
            let componentElement;
            if (LayoutComponent) {
              const routeElement = await RouteComponent(params);

              componentElement = await LayoutComponent({ children: routeElement });
            } else {
              componentElement = await RouteComponent(params);
            }
  
            const componentHtml = componentElement.string;
  
            const div = document.createElement('div');
            div.innerHTML = componentHtml;
            div.dataset.params = params;
  
            div.firstElementChild.setAttribute('data-c-arm-id', componentId);
  
            // old container replacement for future use with HMR
            const oldComponent = container.querySelector(\`[data-c-arm-id="\${componentId}"]\`);
            if (oldComponent) {
              container.replaceChild(div.firstElementChild, oldComponent);
            } else {
              container.appendChild(div.firstElementChild);
            }
          }
        }

        const LayoutComponent = ${layoutComponentName ? `(await import("${layoutJsPath}")).default` : 'null'};
  
        hydrate(${routeComponentName}, container, params, componentId, LayoutComponent);
      `;
    }

    private generateWindowErrorScript(): string {
        return `
          window.addEventListener('error', (event) => {
            console.error('Global error caught:', event.error);
            const appContainer = document.querySelector('div[app]');
            if (appContainer) {
              appContainer.innerHTML = event.error;
              appContainer.innerHTML += '<p>An error occurred. Please try refreshing the page.</p>';
            }
          });
        `;
    }
}

export const buildManager = new BuildManager()
