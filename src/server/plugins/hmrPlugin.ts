import { Elysia } from 'elysia';
import { Stream } from '@elysiajs/stream';
import chokidar from 'chokidar';
import { join, extname, relative } from 'path';
import { debug } from 'index';
import { minifySync } from '@swc/core';

interface HMRConfig {
  prefixToWatch: string;
  extensionsToWatch: string[];
  hmrEndpoint: string;
  hmrEventName: string;
  allowRefreshFromAnotherWindow: boolean;
  debounceTime: number;
}

const defaultConfig: HMRConfig = {
  prefixToWatch: './public',
  extensionsToWatch: [],
  hmrEndpoint: '/__hmr_stream__',
  hmrEventName: 'hmr',
  allowRefreshFromAnotherWindow: false,
  debounceTime: 100,
};

function clientSSECode(config: HMRConfig): string {
  return minifySync(`
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
        if (pendingUpdates.has('*')) {
          window.location.reload();
          return;
        }

        pendingUpdates.forEach(file => {
          if (file.endsWith('.css')) {
            updateCSS(file);
          } else if (file.endsWith('.js')) {
            updateJS(file);
          } else if (file === window.location.pathname) {
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

      function updateJS(file) {
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
  `).code;
}

function createWatcher(config: HMRConfig) {
  return (stream: Stream<string>) => {
    const watchPath = join(process.cwd(), config.prefixToWatch);
    const extensionsToWatch = new Set(config.extensionsToWatch.map(e => e.startsWith('.') ? e : `.${e}`));
    
    const watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('all', (event, path) => {
      if (event === 'change' || event === 'add') {
        debug(`${event} detected: ${path}`);
        const extension = extname(path);
        const relativePath = relative(watchPath, path);
        
        if (extensionsToWatch.size === 0 || extensionsToWatch.has(extension)) {
          stream.send(relativePath);
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
