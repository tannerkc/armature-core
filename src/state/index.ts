import { generateUniqueId } from "../lib/generateId";

let currentSubscriber: Function | null = null;

export const useState: {
  <T>(): [
    (() => T | undefined) & {
      map: <U>(fn: (value: T, index: number, array: T[]) => U) => () => U[];
      condition: (conditions: Record<any, HTMLElement>) => () => HTMLElement[] | undefined;
    },
    (newValue: T) => void
  ];
  <T>(initialValue: T): [
    (() => T) & {
      map: <U>(fn: (value: T extends any[] ? T[number] : never, index: number, array: T extends any[] ? T : never) => U) => () => U[];
      condition: (conditions: Record<any, HTMLElement>) => () => HTMLElement[] | undefined;
    },
    (newValue: T) => void
  ];
} = <T>(initialValue?: T): [
  (() => T | undefined) & {
    map: <U>(fn: (value: T extends any[] ? T[number] : never, index: number, array: T extends any[] ? T : never) => U) => () => U[];
    condition: (conditions: Record<any, HTMLElement>) => () => HTMLElement[] | undefined;
  },
  (newValue: T) => void
] => {
  let value = initialValue;
  const signature = generateUniqueId();
  const subscribers = new Set<Function>();
  let arrayMapping: Function;
  let conditionMapping: Record<any, HTMLElement>;

  const get = () => {
    if (currentSubscriber) {
      subscribers.add(currentSubscriber);
    }
    return value;
  };

  get.isGetter = true;
  get.signature = signature;
  get.map = (fn: Function) => {
    if (!value) {
      throw new TypeError('.map cannot be called on undefined');
    }

    if (!Array.isArray(value)) {
      throw new TypeError('.map can only be called on an array');
    }

    if (typeof fn !== 'function') {
      throw new TypeError(fn + ' is not a function');
    }

    arrayMapping = fn;

    const mappedGetter = () => {
      let v = value as any[]
      const len = v.length >>> 0;
      const result = new Array(len);
      const isArr = Array.isArray(value);
    
      for (let i = 0; i < len; i++) {
        if (isArr || i in v) {
          result[i] = fn.call(value, v[i], i, value);
        }
      }

      return result;
    };
    mappedGetter.isSignalMap = true;
    mappedGetter.signature = signature;

    return mappedGetter
  }
  get.condition = (conditions: Record<any, HTMLElement>) => {
    conditionMapping = conditions;
    const conditionalGetter = () => {
      let currentCondition = conditions[value]
      if (currentCondition) {
        return [currentCondition]
      }
    }
    conditionalGetter.isSignalConditional = true;
    conditionalGetter.signature = signature;

    return conditionalGetter
  }

  const set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue;
      subscribers.forEach(subscriber => subscriber());

      const signalElements = document.querySelectorAll(`[data-sid='${signature}']`);
      signalElements.forEach(signalElement => {
          signalElement.innerHTML = String(newValue);
      });

      // Update mapped signal array elements
      const signalMapElements = document.querySelectorAll(`[data-smid='${signature}']`);
      signalMapElements.forEach(signalMapElement => {
          if (Array.isArray(value)) {
              signalMapElement.innerHTML = value.map((item) => arrayMapping(item).string).join('');
          }
      });

      const signalConditionElements = document.querySelectorAll(`[data-scid='${signature}']`);
      signalConditionElements.forEach(signalConditionElement => {
        let currentCondition = conditionMapping[value]
        console.log(currentCondition)
        console.log(conditionMapping)
        if (currentCondition) {
          signalConditionElement.innerHTML = (currentCondition as any).string;
        } else {
          signalConditionElement.innerHTML = ""
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

            let signalElements = document.querySelectorAll(`[data-sid='${signature}']`)
            if (signalElements) signalElements.forEach(signalElement => {
                signalElement.innerHTML = (newValue as any).toString()
            })
        }
    }

    return [get, set];
}

export const useEffect = (effect: () => void | (() => void), signals?: (() => any)[]) => {
  const runEffect = () => {
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
