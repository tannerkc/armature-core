import { generateUniqueId } from "../lib/generateId";

let currentSubscriber: Function | null = null;
export const useState = <T>(initialValue?: T): [
    (() => T | undefined),
    (newValue: T) => void
  ] => {
    let value = initialValue;
    const signature = generateUniqueId();
    const subscribers = new Set<Function>();
  
    const get = () => {
      if (currentSubscriber) {
        subscribers.add(currentSubscriber);
      }
      return value;
    }

    get.isGetter = true;
    get.signature = signature;
  
    const set = (newValue: any) => {
      if (value !== newValue) {
        value = newValue;
        subscribers.forEach(subscriber => subscriber());

        let signalElements = document.querySelectorAll(`[data-signal-id='${signature}']`)
        if(signalElements) signalElements.forEach(signalElement => {
            signalElement.innerHTML = newValue
        })
      }
    }
  
    return [get, set];
}

// type Cleanup = () => void;
// type EffectCallback = () => void | Cleanup;

// interface Effect {
//   callback: EffectCallback;
//   dependencies: Array<() => any>;
//   cleanup: Cleanup | null;
// }

// const effects: Effect[] = [];
// let currentEffectIndex = 0;

// export function useEffect(callback: EffectCallback, dependencies?: Array<() => any>): void {
//   const effect = effects[currentEffectIndex] || { cleanup: null };
  
//   if (!effects[currentEffectIndex]) {
//     effects.push(effect);
//   }

//   const runEffect = () => {
//     // Run cleanup from last execution if it exists
//     if (effect.cleanup) {
//       effect.cleanup();
//       effect.cleanup = null;
//     }

//     currentSubscriber = () => {
//       runEffect();
//     };

//     const result = callback();

//     currentSubscriber = null;

//     if (typeof result === 'function') {
//       effect.cleanup = result;
//     }
//   };

//   if (!dependencies) {
//     // No dependencies, run effect on every render
//     runEffect();
//   } else if (!effect.dependencies || !arraysEqual(effect.dependencies, dependencies)) {
//     // Dependencies changed, run effect
//     effect.dependencies = dependencies;
//     runEffect();
//   }

//   currentEffectIndex++;
// }

// // Helper function to compare arrays
// function arraysEqual(a: any[], b: any[]): boolean {
//   if (a.length !== b.length) return false;
//   for (let i = 0; i < a.length; i++) {
//     if (a[i]() !== b[i]()) return false;
//   }
//   return true;
// }

// // Reset effect index before each component render
// export function resetEffectIndex(): void {
//   currentEffectIndex = 0;
// }



export const useEffect = (effect: () => void | (() => void), deps?: Array<() => any>) => {
  const cleanupFnRef = { current: null as null | (() => void) };

  const subscriber = () => {
      if (cleanupFnRef.current) {
          cleanupFnRef.current();
      }
      cleanupFnRef.current = effect() || null;
  };

  if (!deps) {
      // Automatically detect dependencies by tracking the getters accessed during effect execution.
      currentSubscriber = subscriber;
      try {
          cleanupFnRef.current = effect() || null;
      } finally {
          currentSubscriber = null;
      }
  } else {
      // Explicit dependencies are provided
      deps.forEach(dep => console.log('dep '+dep().subscribers));
      currentSubscriber = subscriber;
      try {
          cleanupFnRef.current = effect() || null;
      } finally {
          currentSubscriber = null;
      }
      deps.forEach(dep => {
        if (!dep().subscribers) {
          // throw error
        }
        return dep().subscribers.add(subscriber)
      });
  }
};

