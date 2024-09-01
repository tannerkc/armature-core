import { useState } from ".";

type Store<T> = {
    [K in keyof T]: [() => T[K], (newValue: T[K]) => void];
};

type Middleware<T> = (store: Store<T>, key: keyof T, action: (newValue: T[keyof T]) => void) => (newValue: T[keyof T]) => void;

const stores: Record<string, Store<any>> = {};
const globalMiddlewares: Middleware<any>[] = [];

export const use = (middleware: Middleware<any>) => {
  globalMiddlewares.push(middleware);
}

export const createStore = <T extends object>(
  initialState: T, 
  storeId: string, 
  storeSpecificMiddleware: Middleware<T>[] = []
): Store<T> => {
  if (stores[storeId]) {
    throw new Error(`Store with id '${storeId}' already exists`);
  }

  const store: Partial<Store<T>> = {};
  const allMiddlewares = [...globalMiddlewares, ...storeSpecificMiddleware];

  for (const key in initialState) {
    const [getter, setter] = useState(initialState[key], `${storeId}_${key}`);
    
    const enhancedSetter = (newValue: T[keyof T]) => {
      let dispatch = setter;
      allMiddlewares.forEach(mw => {
        dispatch = mw(store as Store<T>, key, dispatch as any);
      });
      dispatch(newValue as any);
    };

    store[key] = [getter, enhancedSetter];
  }

  stores[storeId] = store as Store<T>;
  return store as Store<T>;
}

export const useStore = <T, K extends keyof T>(store: Store<T>, key: K): [() => T[K], (newValue: T[K]) => void] => {
  return store[key];
}

export const loggerMiddleware: Middleware<any> = (store, key, next) => (newValue) => {
  console.log(`Key '${key.toString()}' updated with value:`, newValue);
  next(newValue);
};
