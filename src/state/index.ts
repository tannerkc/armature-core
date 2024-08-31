import { generateUniqueId } from "../utils/generateId";

type Reducer<S, A> = (state: S, action: A) => S;
type Listener<T> = (state: T) => void;

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

export const createStore = <T extends object>(initialState: T, storageKey?: string) => {
  let state = initialState;
  const listeners = new Set<() => void>();

  if (storageKey) {
    try {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        state = { ...initialState, ...JSON.parse(savedState) };
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
    }
  }

  const getState = (): T => {
    return state;
  }

  const setState = (newState: Partial<T> | ((prevState: T) => Partial<T>)) => {
    const nextState = typeof newState === 'function'
      ? newState(state)
      : newState;
    
    state = { ...state, ...nextState };
    
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save state to localStorage:', error);
      }
    }
    listeners.forEach(listener => listener());
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { getState, setState, subscribe };
}

export const useStore = <T extends object, K extends keyof T>(
  store: ReturnType<typeof createStore<T>>,
  selector: K
): [() => T[K], (newValue: T[K]) => void] => {
  const [, forceUpdate] = useState({});

  const getValue = () => {
    if (currentSubscriber) {
      store.subscribe(() => forceUpdate({}));
    }
    return store.getState()[selector];
  };

  const setValue = (newValue: T[K]) => {
    store.setState((prevState: T) => ({
      ...prevState,
      [selector]: newValue
    }));
  };

  return [getValue, setValue];
}
