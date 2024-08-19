import { Elysia } from 'elysia';
import { Stream } from '@elysiajs/stream';
import chokidar from 'chokidar';
import { join, extname, relative, dirname } from 'path';
import { debug, log } from '../../';
import { build } from 'bun';

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
};

function clientSSECode(config: HMRConfig): string {
  return `
    (function() {
      let hmrSource;
      const pendingUpdates = new Set();
      const routeVersions = new Map();

      function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }

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

      function handleHMRUpdate(data) {
        const {file, version} = JSON.parse(data);
        pendingUpdates.add({file, version});
        processPendingUpdates();
      }

      function updateCSS(file, version) {
        const links = document.getElementsByTagName("link");
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          if (link.rel === "stylesheet" && link.href.includes(file)) {
            const newLink = document.createElement("link");
            newLink.rel = "stylesheet";
            newLink.href = link.href.split("?")[0] + "?v=" + version;
            newLink.onload = () => link.remove();
            link.parentNode.insertBefore(newLink, link.nextSibling);
            return;
          }
        }
      }

      function updateJS(file, version) {
        const correctedFile = file.replace('/src/', '/');
        import('/'+correctedFile + '?v=' + version).then(module => {
          if (module.default && typeof module.default === 'function') {
            const container = document.querySelector('div[app]');
            if (container) {
              const params = JSON.parse(container.dataset.params || '{}');
              container.innerHTML = module.default(params).string;
            }
          }
        }).catch(error => {
          console.error('Error updating compiled module:', error);
        });
      }

      function updateStaticJS(file, version) {
        const scripts = document.getElementsByTagName("script");
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          if (script.src && script.src.includes(file)) {
            const newScript = document.createElement("script");
            newScript.src = script.src.split("?")[0] + "?v=" + version;
            newScript.onload = () => script.remove();
            script.parentNode.insertBefore(newScript, script.nextSibling);
            return;
          }
        }
      }

      function checkForUpdates() {
        const currentPath = window.location.pathname;
        const storedVersions = JSON.parse(sessionStorage.getItem('routeVersions') || '{}');
        Object.entries(storedVersions).forEach(([file, version]) => {
          if (file.includes(currentPath) || file.endsWith('.css') || file.endsWith('.js')) {
            handleHMRUpdate(JSON.stringify({file, version}));
          }
        });
      }

      window.addEventListener('load', () => {
        hmrSource = new EventSource("${config.hmrEndpoint}");
        hmrSource.addEventListener("${config.hmrEventName}", (event) => {
          handleHMRUpdate(event.data);
        });
        checkForUpdates();
      });

      window.addEventListener('popstate', checkForUpdates);

      window.addEventListener("unload", () => {
        if(hmrSource) hmrSource.close();
      });

      ${config.allowRefreshFromAnotherWindow ? `
        const channel = new BroadcastChannel("${config.hmrEventName}");
        channel.addEventListener("message", (event) => {
          console.log("Broadcast received:", event.data);
          handleHMRUpdate(event.data);
        });
        window.addEventListener("unload", () => {
          channel.close();
        });
      ` : ''}
    })();
  `;
}

async function buildFile(filePath: string, outDir: string, srcDir: string) {
  try {
    const relativePath = relative(srcDir, filePath);
    const outPath = join(outDir, relativePath.replace(/\.tsx?$/, '.js'));
    
    const result = await build({
      entrypoints: [filePath],
      outdir: dirname(outPath),
      minify: true,
      splitting: true,
    });

    if (!result.success) {
      log.error('Build failed:');
      log.error(result)
      return null;
    }

    for (const output of result.outputs) {
      if (output.kind === "entry-point") {
        return relative(process.cwd(), output.path);
      }
    }
  } catch (error) {
    log.error('Build error:' + error);
  }

  return null;
}

function createWatcher(config: HMRConfig) {
  return (stream: Stream<string>) => {
    const srcPath = join(process.cwd(), config.srcDir);
    const publicPath = join(process.cwd(), config.publicDir);
    
    const watcher = chokidar.watch([srcPath, publicPath], {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('all', async (event, path) => {
      if (event === 'change' || event === 'add') {
        debug(`${event} detected: ${path}`);
        const ext = extname(path);
        const version = Date.now().toString();
        
        if (path.startsWith(srcPath) && ext === '.tsx') {
          const builtFile = await buildFile(path, config.outDir, config.srcDir);
          if (builtFile) {
            stream.send(JSON.stringify({ file: builtFile, version }));
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

export const hmr = async (config: Partial<HMRConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config } as HMRConfig;

  const clientCode = clientSSECode(finalConfig);

  await Bun.write(join(process.cwd(), '.armature', 'hmr.js'), clientCode);

  return new Elysia()
    .get(finalConfig.hmrEndpoint, () => 
      new Stream(createWatcher(finalConfig), {
        retry: 10000,
        event: finalConfig.hmrEventName,
      })
    );
};
