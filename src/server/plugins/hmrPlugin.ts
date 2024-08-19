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
        pendingUpdates.forEach(file => {
          if (file.startsWith('/.armature/')) {
            updateCompiledJS(file);
          } else if (file.endsWith('.css')) {
            updateCSS(file);
          } else if (file.endsWith('.js')) {
            updateStaticJS(file);
          } else {
            // For other file types, just reload the page
            window.location.reload();
          }
        });

        pendingUpdates.clear();
      }, ${config.debounceTime});

      function handleHMRUpdate(data) {
        pendingUpdates.add(data);
        processPendingUpdates();
      }

      function updateCSS(file) {
        const links = document.getElementsByTagName("link");
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          if (link.rel === "stylesheet" && link.href.includes(file)) {
            const newLink = document.createElement("link");
            newLink.rel = "stylesheet";
            newLink.href = link.href.split("?")[0] + "?t=" + Date.now();
            newLink.onload = () => link.remove();
            link.parentNode.insertBefore(newLink, link.nextSibling);
            return;
          }
        }
      }

      function updateCompiledJS(file) {
        import(file + '?t=' + Date.now()).then(module => {
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

      function updateStaticJS(file) {
        const scripts = document.getElementsByTagName("script");
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          if (script.src && script.src.includes(file)) {
            const newScript = document.createElement("script");
            newScript.src = script.src.split("?")[0] + "?t=" + Date.now();
            newScript.onload = () => script.remove();
            script.parentNode.insertBefore(newScript, script.nextSibling);
            return;
          }
        }
      }

      window.addEventListener('load', () => {
        hmrSource = new EventSource("${config.hmrEndpoint}");
        hmrSource.addEventListener("${config.hmrEventName}", (event) => {
          handleHMRUpdate(event.data);
        });
      });

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
        
        if (path.startsWith(srcPath) && ext === '.tsx') {
          const builtFile = await buildFile(path, config.outDir, config.srcDir);
          if (builtFile) {
            stream.send(builtFile);
          }
        } else if (path.startsWith(publicPath)) {
          const relativePath = relative(publicPath, path);
          stream.send('/' + relativePath);
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
