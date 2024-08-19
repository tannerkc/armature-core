import { Elysia } from 'elysia';
import { Stream } from '@elysiajs/stream';
import chokidar from 'chokidar';
import { join, extname } from 'path';

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
    window.addEventListener('load', () => {
      hmrSource = new EventSource("${hmrEndpoint}");
      hmrSource.addEventListener("${hmrEventName}", (event) => {
        const data = event.data;
        if(data === "*" || data === window.location.pathname) {
          window.location.reload()
        }
      });
    })
    window.addEventListener("unload", () => {
      if(hmrSource) hmrSource.close();
    });
  `;

  const broadcastChannelCode = allowRefreshFromAnotherWindow ? `
    const channel = new BroadcastChannel("${hmrEventName}");
    channel.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if(data === "*" || data === window.location.pathname) {
        window.location.reload()
      }
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
    const extensionsToWatch = config.extensionsToWatch.map(e => e.startsWith('.') ? e : `.${e}`);
    
    const watcher = chokidar.watch(config.prefixToWatch, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    watcher.on('change', (path) => {
      const extension = extname(path);
      const data = config.prefixToWatch ? join(config.prefixToWatch, path) : '*';
      
      if (extensionsToWatch.length === 0 || extensionsToWatch.includes(extension)) {
        stream.send(data);
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

  // Save client-side script to /.armature/hmr.js
  await Bun.write(join(process.cwd(),'.armature','hmr.js'), clientCode);

  return new Elysia()
    .get(finalConfig.hmrEndpoint, () => 
      new Stream(watcher(finalConfig), {
        retry: 10000,
        event: finalConfig.hmrEventName,
      })
    );
};
