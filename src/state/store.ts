import { useState } from ".";

// type Action<T> = { type: string, payload?: T[keyof T] };
// export type Reducer<T> = (state: T, action: Action<T>) => T;

type Action<T> = { type: string, payload?: any };
export type Reducer<S, A> = (state: S, action: A) => S;

export type Store<T> = {
    [K in keyof T]: [() => T[K], (newValue: T[K]) => void];
};

type Middleware<T> = (store: Store<T>, key: keyof T, action: (newValue: T[keyof T]) => void) => (newValue: T[keyof T]) => void;

const stores: Record<string, Store<any>> = {};
const globalMiddlewares: Middleware<any>[] = [];

export const use = (middleware: Middleware<any>) => {
  globalMiddlewares.push(middleware);
}

export function createStore<T extends object, A>(
    initialState: T, 
    storeId: string, 
    storeSpecificMiddleware: Middleware<T>[] = [], 
    reducer?: Reducer<T, A>
  ): Store<T> & { dispatch: (action: A) => void } {
    if (stores[storeId]) {
      throw new Error(`Store with id '${storeId}' already exists`);
    }
  
    const store: Store<T> = {} as Store<T>;
    const allMiddlewares = [...globalMiddlewares, ...storeSpecificMiddleware];
  
    let currentState = initialState;
  
    const dispatch = (action: A) => {
      if (!reducer) {
        throw new Error(`No reducer provided for store '${storeId}'`);
      }
  
      const newState = reducer(currentState, action);
      
      for (const key in newState) {
        if (newState[key] !== currentState[key]) {
          const setter = store[key]?.[1];
          setter && setter(newState[key]);
        }
      }
  
      currentState = newState;
    };
  
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
  
    stores[storeId] = store;
  
    return { ...store, dispatch };
}

// export const useStore = <T, K extends keyof T>(store: Store<T>, key: K): [() => T[K], (newValue: T[K]) => void] => {
//   return store[key];
// }

export function useStore<T, K extends Exclude<keyof T, 'dispatch'>>(
    store: Store<T>,
    key: K
): [() => T[K], (newValue: T[K]) => void] {
    return store[key];
}
  

export const loggerMiddleware: Middleware<any> = (store, key, next) => (newValue) => {
  console.log(`Key '${key.toString()}' updated with value:`, newValue);
  next(newValue);
};
