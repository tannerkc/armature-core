import { generateUniqueId } from "../lib/generateId";

let currentSubscriber: Function | null = null;

let currentlyRendering: Set<() => any> | null = null;

function detectSignalUsage<T>(fn: () => T): { result: T; usedSignals: Set<() => any> } {
  const previousRendering = currentlyRendering;
  currentlyRendering = new Set();

  const result = fn();

  const usedSignals = currentlyRendering;
  currentlyRendering = previousRendering;

  return { result, usedSignals };
}

export const useState: {
  <T>(): [() => T | undefined, (newValue: T) => void];
  <T>(initialValue: T): [() => T, (newValue: T) => void];
} = <T>(initialValue?: T): [() => T | undefined, (newValue: T) => void] => {
  let value = initialValue;
  const signature = generateUniqueId();
  const subscribers = new Set<Function>();
  let arrayMapping: Function;

  const get = () => {
    if (currentSubscriber) {
      subscribers.add(currentSubscriber);
    }
    return value;
  };

  get.isGetter = true;
  get.signature = signature;
  get.map = (fn: Function) => {
    if (!Array.isArray(value)) {
      throw new TypeError('.map can only be calld on an array');
    }

    if (typeof fn !== 'function') {
      throw new TypeError(fn + ' is not a function');
    }

    arrayMapping = fn;

    const len = value.length >>> 0;
    const result = new Array(len);
    const isArr = Array.isArray(value);
  
    for (let i = 0; i < len; i++) {
      if (isArr || i in value) {
        result[i] = fn.call(value, value[i], i, value);
      }
    }

    return result;
  }

  const set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue;
      subscribers.forEach(subscriber => subscriber());

      const signalElements = document.querySelectorAll(`[data-signal-id='${signature}']`);
      signalElements.forEach(signalElement => {
        if (Array.isArray(value)) {
          signalElement.innerHTML = value.map((val) => arrayMapping(val))
        } else {
          signalElement.innerHTML = String(newValue);
        }
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


const stringToHTML = (htmlString: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  return doc.body.firstChild;
}
