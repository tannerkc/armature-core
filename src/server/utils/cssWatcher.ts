import chokidar from 'chokidar';
import path from 'path';

export function watchCSS(publicDir: string, onChange: () => void) {
  const watcher = chokidar.watch(path.join(publicDir, '**/*.css'), {
    ignored: /(^|[\/\\])\../,
    persistent: true
  });

  watcher.on('change', (path) => {
    // console.log(`CSS file changed: ${path}`);
    onChange();
  });

  return watcher;
}
