import { generateUniqueId } from "../lib/generateId";

let currentSubscriber: Function | null = null;

export const useState: {
  <T>(): [() => T | undefined, (newValue: T) => void];
  <T>(initialValue: T): [() => T, (newValue: T) => void];
} = <T>(initialValue?: T): [() => T | undefined, (newValue: T) => void] => {
  let value = initialValue;
  const signature = generateUniqueId();
  const subscribers = new Set<Function>();

  const get = () => {
    if (currentSubscriber) {
      subscribers.add(currentSubscriber);
    }
    return value;
  };

  get.isGetter = true;
  get.signature = signature;

  const set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue;
      subscribers.forEach(subscriber => subscriber());

      const signalElements = document.querySelectorAll(`[data-signal-id='${signature}']`);
      signalElements.forEach(signalElement => {
          signalElement.innerHTML = String(newValue);
      });
    }
  };

  return [get, set];
};


export const usePersistentState: {
  <T>(key: string): [() => T, (newValue: T) => void];
  <T>(key: string, initialValue: T): [() => T, (newValue: T) => void];
} = <T>(key: string, initialValue?: T): [
    (() => T),
    (newValue: T) => void
  ] => {
    const signature = generateUniqueId();
    const subscribers = new Set<Function>();

    const storedValue = localStorage.getItem(key);
    let value = storedValue !== null ? JSON.parse(storedValue) : initialValue;

    const get = () => {
        if (currentSubscriber) {
            subscribers.add(currentSubscriber);
        }
        return value;
    }

    get.isGetter = true;
    get.signature = signature;

    const set = (newValue: T): void => {
        if (value !== newValue) {
            value = newValue;
            localStorage.setItem(key, JSON.stringify(newValue));
            subscribers.forEach(subscriber => subscriber());

            let signalElements = document.querySelectorAll(`[data-signal-id='${signature}']`)
            if (signalElements) signalElements.forEach(signalElement => {
                signalElement.innerHTML = (newValue as any).toString()
            })
        }
    }

    return [get, set];
}

export const useEffect = (effect: () => void | (() => void), signals?: (() => any)[]) => {
  const runEffect = () => {
    // Run the effect and handle cleanup
    if (typeof cleanup === 'function') {
        cleanup();
    }
    cleanup = effect();
  };

  let cleanup: void | (() => void);
  
  if (signals) {
      signals.forEach(signal => {
        const subscriber = () => runEffect();
    
        currentSubscriber = subscriber;
        signal();
        currentSubscriber = null;
      });
  } else {
    const cleanupFnRef = { current: null as null | (() => void) };

    const subscriber = () => {
        if (cleanupFnRef.current) {
            cleanupFnRef.current();
        }
        cleanupFnRef.current = effect() || null;
    };
  
    // Automatically detect dependencies by tracking the getters accessed during effect execution.
    currentSubscriber = subscriber;
    try {
        cleanupFnRef.current = effect() || null;
    } finally {
        currentSubscriber = null;
    }
  }

  runEffect();
};
