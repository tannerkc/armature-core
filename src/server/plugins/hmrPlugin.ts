import { Elysia } from 'elysia';
import { Stream } from '@elysiajs/stream';
import chokidar from 'chokidar';
import { join, extname, relative } from 'path';
import { debug } from 'index';

interface HMRConfig {
  prefixToWatch: string;
  extensionsToWatch: string[];
  hmrEndpoint: string;
  hmrEventName: string;
  allowRefreshFromAnotherWindow: boolean;
}

const defaultConfig: HMRConfig = {
  prefixToWatch: './public',
  extensionsToWatch: [],
  hmrEndpoint: '/__hmr_stream__',
  hmrEventName: 'hmr',
  allowRefreshFromAnotherWindow: false,
};

function clientSSECode(hmrEndpoint: string, hmrEventName: string, allowRefreshFromAnotherWindow: boolean): string {
  const hmrCode = `
    let hmrSource = undefined;
    function handleHMRUpdate(data) {
      if (data === "*") {
        window.location.reload();
      } else if (data.endsWith('.css')) {
        updateCSS(data);
      } else if (data === window.location.pathname || data.endsWith('.js')) {
        window.location.reload();
      }
    }

    function updateCSS(file) {
      const links = document.getElementsByTagName("link");
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link.rel === "stylesheet" && link.href.includes(file)) {
          const newLink = document.createElement("link");
          newLink.rel = "stylesheet";
          newLink.href = link.href.split("?")[0] + "?t=" + new Date().getTime();
          newLink.onload = () => link.remove();
          link.parentNode.insertBefore(newLink, link.nextSibling);
          return;
        }
      }
    }

    window.addEventListener('load', () => {
      hmrSource = new EventSource("${hmrEndpoint}");
      hmrSource.addEventListener("${hmrEventName}", (event) => {
        handleHMRUpdate(event.data);
      });
    });

    window.addEventListener("unload", () => {
      if(hmrSource) hmrSource.close();
    });
  `;

  const broadcastChannelCode = allowRefreshFromAnotherWindow ? `
    const channel = new BroadcastChannel("${hmrEventName}");
    channel.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      console.log("Broadcast received:", data);
      handleHMRUpdate(data);
    });
    window.addEventListener("unload", () => {
      channel.close();
    });
  ` : '';

  return `
    (function() {
      ${hmrCode}
      ${broadcastChannelCode}
    })();
  `;
}

function watcher(config: HMRConfig) {
  return (stream: Stream<string>) => {
    const watchPath = join(process.cwd(), config.prefixToWatch);
    const extensionsToWatch = config.extensionsToWatch.map(e => e.startsWith('.') ? e : `.${e}`);
    
    const watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    watcher.on('change', (path) => {
      debug(`Change detected: ${path}`);
      const extension = extname(path);
      const relativePath = relative(watchPath, path);
      debug(`Relative path: ${relativePath}`);
      
      if (extensionsToWatch.length === 0 || extensionsToWatch.includes(extension)) {
        stream.send(relativePath);
      }
    });

    return () => watcher.close(); // Clean up function
  };
}

export const hmr = async (config: Partial<HMRConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config } as HMRConfig;

  const clientCode = clientSSECode(
    finalConfig.hmrEndpoint,
    finalConfig.hmrEventName,
    finalConfig.allowRefreshFromAnotherWindow
  );

  await Bun.write(join(process.cwd(),'.armature','hmr.js'), clientCode);

  return new Elysia()
    .get(finalConfig.hmrEndpoint, () => 
      new Stream(watcher(finalConfig), {
        retry: 10000,
        event: finalConfig.hmrEventName,
      })
    );
};
