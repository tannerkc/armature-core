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

