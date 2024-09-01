import { generateUniqueId } from "../utils/generateId";

type Reducer<S, A> = (state: S, action: A) => S;
type Store<T> = {
  [K in keyof T]: [() => T[K], (newValue: T[K]) => void];
};

let currentSubscriber: Function | null = null;

export const useState: {
  <T>(): [(() => T | undefined) & { map: Function, condition: Function }, (newValue: T) => void];
  <T>(initialValue: T): [(() => T) & { map: Function, condition: Function }, (newValue: T) => void];
  <T>(initialValue: T, key: string): [(() => T) & { map: Function, condition: Function }, (newValue: T) => void];
} = <T>(initialValue?: T, key?: string): [(() => T | undefined) & { map: Function, condition: Function }, (newValue: T) => void] => {
  const signature = generateUniqueId();
  const subscribers = new Set<Function>();
  let arrayMapping: Function;
  let conditionMapping: Array<{ condition: (value: T) => boolean, element: HTMLElement }> | Record<any, HTMLElement>;

  let value = key ? JSON.parse(localStorage.getItem(key) || 'null') ?? initialValue : initialValue;

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
      let v = value as any[];
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

    return mappedGetter;
  };
  get.condition = (conditions: Array<{ condition: (value: T) => boolean, element: HTMLElement }> | Record<any, HTMLElement>) => {
    conditionMapping = conditions;
    const conditionalGetter = () => {
      if (Array.isArray(conditions)) {
        for (let { condition, element } of conditions) {
          if (condition(value)) {
            return [element];
          }
        }
      } else {
        const currentCondition = conditions[value];
        if (currentCondition) {
          return [currentCondition];
        }
      }
      return null;
    };
    conditionalGetter.isSignalConditional = true;
    conditionalGetter.signature = signature;

    return conditionalGetter;
  };

  const set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue;
      
      if (key) {
        localStorage.setItem(key, JSON.stringify(newValue));
      }

      subscribers.forEach(subscriber => subscriber());

      const signalElements = document.querySelectorAll(`[data-sid='${signature}']`);
      signalElements.forEach(signalElement => {
        signalElement.innerHTML = String(newValue);
      });

      const signalMapElements = document.querySelectorAll(`[data-smid='${signature}']`);
      signalMapElements.forEach(signalMapElement => {
        if (Array.isArray(value)) {
          signalMapElement.innerHTML = value.map((item) => arrayMapping(item).string).join('');
        }
      });

      const signalConditionElements = document.querySelectorAll(`[data-scid='${signature}']`);
      signalConditionElements.forEach(signalConditionElement => {
        if (Array.isArray(conditionMapping)) {
          for (let { condition, element } of conditionMapping) {
            if (condition(value)) {
              signalConditionElement.innerHTML = (element as any).string;
              return;
            }
          }
        } else {
          const currentCondition = conditionMapping[value];
          if (currentCondition) {
            signalConditionElement.innerHTML = (currentCondition as any).string;
            return;
          }
        }
        signalConditionElement.innerHTML = "";
      });
    }
  };

  return [get, set];
};

export const useReducer = <S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  initializer?: (arg: S) => S
): [() => S, (action: A) => void] => {
  const [state, setState] = useState<S>(initializer ? initializer(initialState) : initialState);

  const dispatch = (action: A) => {
    setState(reducer(state(), action));
  };

  return [state, dispatch];
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

const stores: Record<string, Store<any>> = {};

// export function createStore<T extends object>(initialState: T, storeId: string): Store<T> {
//   if (stores[storeId]) {
//     throw new Error(`Store with id '${storeId}' already exists`);
//   }

//   const store: Partial<Store<T>> = {};

//   for (const key in initialState) {
//     const [getter, setter] = useState(initialState[key], `${storeId}_${key}`);
//     store[key] = [getter, setter];
//   }

//   stores[storeId] = store as Store<T>;
//   return store as Store<T>;
// }

// export function useStore<T, K extends keyof T>(store: Store<T>, key: K): [() => T[K], (newValue: T[K]) => void] {
//   return store[key];
// }
