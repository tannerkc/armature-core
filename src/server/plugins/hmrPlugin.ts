import { Elysia } from 'elysia';
import { Stream } from '@elysiajs/stream';
import chokidar from 'chokidar';
import { join, extname, relative, dirname } from 'path';
import { debug, log } from '../../';
import { build } from 'bun';
import { ignoreCssPlugin } from './ignoreCssPlugin';
import { minifySync } from '@swc/core';

interface HMRConfig {
  srcDir: string;
  publicDir: string;
  outDir: string;
  hmrEndpoint: string;
  hmrEventName: string;
  allowRefreshFromAnotherWindow: boolean;
  debounceTime: number;
}

const defaultConfig: HMRConfig = {
  srcDir: './src',
  publicDir: './public',
  outDir: './.armature',
  hmrEndpoint: '/__hmr_stream__',
  hmrEventName: 'hmr',
  allowRefreshFromAnotherWindow: false,
  debounceTime: 100,
} as const;

function clientSSECode(config: HMRConfig): string {
  return `
    (function() {
      let hmrSource;
      const pendingUpdates = new Set();
      const routeVersions = new Map();

      const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), wait);
        };
      };

      const processPendingUpdates = debounce(() => {
        pendingUpdates.forEach(({file, version}) => {
          if (file.endsWith('.css')) {
            updateCSS(file, version);
          } else if (file.endsWith('.js')) {
            updateJS(file, version);
          } else {
            routeVersions.set(file, version);
          }
        });

        pendingUpdates.clear();
        sessionStorage.setItem('routeVersions', JSON.stringify(Array.from(routeVersions)));
      }, ${config.debounceTime});

      const handleHMRUpdate = (data) => {
        try {
          const {file, version} = JSON.parse(data);
          pendingUpdates.add({file, version});
          processPendingUpdates();
        } catch (error) {
          console.error('Error handling HMR update:', error);
        }
      };

      const updateCSS = (file, version) => {
        if (!file.startsWith('@scope')) {
          const link = document.querySelector('link[rel="stylesheet"][href*="'+file+'"]');
          if (link) {
            const newLink = document.createElement("link");
            newLink.rel = "stylesheet";
            newLink.href = link.href.split("?")[0] + "?v=" + version;
            newLink.onload = () => link.remove();
            link.parentNode.insertBefore(newLink, link.nextSibling);
          }
        } else {
          const styleElement = document.querySelector('style[data-hmr]');
          const newContent = file.replace('@scope ','').replace(' .css','');
          if (styleElement) {
            styleElement.textContent = newContent;
          } else {
            const newStyle = document.createElement('style');
            newStyle.setAttribute('data-hmr', 'true');
            newStyle.textContent = newContent;
            document.head.appendChild(newStyle);
          }
        }
      };

      const updateJS = async (file, version) => {
        const correctedFile = file.replace('/src/', '/');
        try {
          const module = await import('/' + correctedFile + '?v=' + version);
          if (typeof module.default === 'function') {
            const container = document.querySelector('div[app]');
            if (container) {
              const params = JSON.parse(container.dataset.params || '{}');
              container.innerHTML = module.default(params).string;
            }
          }
        } catch(error) {
          console.error('Error updating compiled module:', error);
        }
      };

      const checkForUpdates = () => {
        const currentPath = window.location.pathname;
        const storedVersions = JSON.parse(sessionStorage.getItem('routeVersions') || '{}');
        Object.entries(storedVersions).forEach(([file, version]) => {
          if (file.includes(currentPath) || file.endsWith('.css') || file.endsWith('.js')) {
            handleHMRUpdate(JSON.stringify({file, version}));
          }
        });
      };

      window.addEventListener('load', () => {
        hmrSource = new EventSource("${config.hmrEndpoint}");
        hmrSource.addEventListener("${config.hmrEventName}", (event) => handleHMRUpdate(event.data));
        checkForUpdates();
      });

      window.addEventListener('popstate', checkForUpdates);
      window.addEventListener("unload", () => hmrSource?.close());

      ${config.allowRefreshFromAnotherWindow ? `
        const channel = new BroadcastChannel("${config.hmrEventName}");
        channel.addEventListener("message", (event) => {
          console.log("Broadcast received:", event.data);
          handleHMRUpdate(event.data);
        });
        window.addEventListener("unload", () => channel.close());
      ` : ''}
    })();
  `;
}

async function buildFile(filePath: string, outDir: string, srcDir: string): Promise<string | null> {
  try {
    const relativePath = relative(srcDir, filePath);
    const outPath = join(outDir, relativePath.replace(/\.tsx?$/, '.js'));
    
    const result = await build({
      entrypoints: [filePath],
      outdir: dirname(outPath),
      minify: true,
      splitting: true,
      plugins: [ignoreCssPlugin()],
    });

    if (!result.success) {
      log.error('Build failed:');
      log.error(result)
      return null;
    }

    const entryPoint = result.outputs.find(output => output.kind === "entry-point");
    return entryPoint ? relative(process.cwd(), entryPoint.path) : null;
  } catch (error) {
    log.error('Build error:');
    log.error(error)
    return null;
  }
}

function createWatcher(config: HMRConfig) {
  return (stream: Stream<string>) => {
    const srcPath = join(process.cwd(), config.srcDir);
    const publicPath = join(process.cwd(), config.publicDir);
    
    const watcher = chokidar.watch([srcPath, publicPath], {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('all', async (event, path) => {
      if (event === 'change' || event === 'add') {
        debug(`${event} detected: ${path}`);
        const ext = extname(path);
        const version = Date.now().toString();
        
        if (path.startsWith(srcPath)) {
          if (ext === '.tsx') {
            const builtFile = await buildFile(path, config.outDir, config.srcDir);
            if (builtFile) {
              stream.send(JSON.stringify({ file: builtFile, version }));
            }
          } else if (ext === '.css') {
            const file = Bun.file(path);
            const cssContent = await file.text();
            stream.send(JSON.stringify({ file: `@scope ${cssContent} .css`, version }));
          }
        } else if (path.startsWith(publicPath)) {
          const relativePath = relative(publicPath, path);
          stream.send(JSON.stringify({ file: '/' + relativePath, version }));
        }
      }
    });

    return () => watcher.close();
  };
}

export const hmr = async (config: Partial<HMRConfig> = {}): Promise<Elysia> => {
  const finalConfig: HMRConfig = { ...defaultConfig, ...config };

  const clientCode = clientSSECode(finalConfig);

  await Bun.write(join(process.cwd(), '.armature', 'hmr.js'), minifySync(clientCode).code);

  return new Elysia()
    .get(finalConfig.hmrEndpoint, () => 
      new Stream(createWatcher(finalConfig), {
        retry: 10000,
        event: finalConfig.hmrEventName,
      })
    );
};
