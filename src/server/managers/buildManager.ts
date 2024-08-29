import { CONFIG } from '../../config';
import { cacheManager } from './cacheManager';
import { join, normalize, relative } from "path";
import { minifySync } from "@swc/core";
import { appendFile } from 'node:fs/promises';
import { hashFilePath } from "../../utils";
import { isProduction, log } from "../../index";

interface BuildResult {
  success: boolean;
  jsContent: string;
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

  async buildRoute(filePath: string): Promise<BuildResult> {
    try {
      const cachedBuild = cacheManager.getBuildInfo(filePath);
      if (cachedBuild) {
        return cachedBuild;
      }

      const compilePath = normalize(join(CONFIG.BUILD_DIR, relative(CONFIG.ROUTES_DIR, filePath)));

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

      const result: BuildResult = {
        success: true,
        jsContent: '',
        cssContent: '',
      };

      for (const output of buildResult.outputs) {
        if (output.kind === "entry-point") {
          result.jsContent = await this.processJsOutput(output, filePath);
        } else if (output.path.endsWith('.css')) {
          result.cssContent += await output.text();
        }
      }

      cacheManager.setBuildInfo(filePath, result);
      return result;
    } catch (error) {
      log.error(`Build error for ${filePath}:`+ error);
      return {
        success: false,
        jsContent: '',
        cssContent: '',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private async processJsOutput(output: any, filePath: string): Promise<string> {
    let jsContent = await output.text();

    const componentName = this.extractComponentName(jsContent);
    const componentId = hashFilePath(relative(process.cwd(), output.path));

    const hydrateScript = this.generateHydrateScript(componentName, componentId, filePath);
    const windowErrorScript = this.generateWindowErrorScript();

    const additionalJsContent = minifySync(hydrateScript + windowErrorScript).code;

    const outputPath = '/' + relative(process.cwd(), output.path);
    await appendFile(output.path, additionalJsContent);

    return outputPath;
  }

  private extractComponentName(jsContent: string): string {
    const regex = /export\s*[\{\(\[]\s*([a-zA-Z0-9_$&]+)\s+as\s+default\s*[\}\)\]]\s*;?/;
    const match = jsContent.match(regex);
    return match?.[1] || 'DefaultComponent';
  }

  private generateHydrateScript(componentName: string, componentId: string, filePath: string): string {
    return `
      const container = document.querySelector('div[app]');
      const params = ${JSON.stringify({})};
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

      const Layout = ${CONFIG.LAYOUT_PATH ? `await import("${CONFIG.LAYOUT_PATH}").then(mod => mod.default)` : 'null'};

      hydrate((params) => Layout ? Layout({ children: ${componentName}(params) }) : ${componentName}(params), container, params, componentId);
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

export const buildManager = new BuildManager();
