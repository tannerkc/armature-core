type EffectCallback = () => (void | (() => void));
type DependencyList = ReadonlyArray<any>;

const mountEffects: Array<[EffectCallback, DependencyList | undefined]> = [];

export function onMount(effect: EffectCallback, deps?: DependencyList): void {
  mountEffects.push([effect, deps]);
}

function runMountEffects() {
  mountEffects.forEach(([effect, deps]) => {
    const cleanup = effect();
    if (typeof cleanup === 'function') {
      // Store cleanup function for potential future use
      // (e.g., if we implement an unmount lifecycle in the future)
    }
  });
  // Clear the effects after running them
  mountEffects.length = 0;
}

// Run effects when the DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runMountEffects);
  } else {
    runMountEffects();
  }
}
