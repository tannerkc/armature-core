import { generateUniqueId } from "src/lib/generateId";

let currentSubscriber: Function | null = null;

export const useState = <T>(initialValue?: T): [() => T | undefined, (newValue: T) => void] => {
  let value = initialValue;
  const signature = generateUniqueId();
  const subscribers = new Set<Function>();

  const get = () => {
    if (currentSubscriber) {
      console.log(currentSubscriber)
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

export const usePersistentState = <T>(key: string, initialValue?: T): [
    (() => T | undefined),
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

export const useEffect = (effect: () => void | (() => void), signals: (() => any)[]) => {
  const runEffect = () => {
    // Run the effect and handle cleanup
    if (typeof cleanup === 'function') {
        cleanup();
    }
    cleanup = effect();
  };

  let cleanup: void | (() => void);
  
  // Subscribe to all signals
  signals.forEach(signal => {
    const subscriber = () => runEffect();
    console.log(subscriber)

    // Ensure the effect re-runs when any of the signals change
    currentSubscriber = subscriber;
    signal(); // This subscribes the effect to the signal
    currentSubscriber = null;
  });

  // Initial run
  runEffect();
};
