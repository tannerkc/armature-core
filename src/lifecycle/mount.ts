type MountCallback = () => void | Promise<void> | (() => Promise<void>) | (() => void);

interface MountEffect {
  callback: MountCallback;
  cleanup: (() => void) | undefined;
}

const mountQueue: MountEffect[] = [];
const mountedEffects: MountEffect[] = [];
let isDomReady = false;

function executeMountQueue() {
  while (mountQueue.length > 0) {
    const effect = mountQueue.shift()!;
    try {
      const result = effect.callback();
      if (result instanceof Promise) {
        result.then(cleanupFn => {
          if (typeof cleanupFn === 'function') {
            effect.cleanup = cleanupFn;
          }
          mountedEffects.push(effect);
        }).catch(error => console.error(`Error in onMount callback:`, error));
      } else if (typeof result === 'function') {
        effect.cleanup = result;
        mountedEffects.push(effect);
      } else {
        mountedEffects.push(effect);
      }
    } catch (error) {
      console.error(`Error in onMount callback for component:`, error);
    }
  }
}

// TODO: implement router tracking to handle cleanup on route change (unmount)

export function onMount(callback: MountCallback) {
  mountQueue.push({ callback, cleanup: undefined });

  if (isDomReady) {
    executeMountQueue();
  }
}

export function domReady() {
  isDomReady = true;
  executeMountQueue();
}

queueMicrotask(()=>{
  domReady()
})
