import { deepEqual } from "effective-jsx";
import { useEffect, useState } from ".";

export type Action<P = any> = {
  type: string;
  payload?: P;
};

export type Reducer<S, A extends Action = Action> = (state: S, action: A) => S;

export type Store<T> = {
    [K in keyof T]: [(() => T[Extract<keyof T, string>]) & { map: Function; condition: Function; }, (newValue: T[keyof T]) => void]
} & {
    use: (middlewareOrReducer: Middleware<T> | Reducer<T, any>) => void;
    dispatch: (action: Action) => void;
};

type Middleware<T> = (
    store: Omit<Store<T>, 'use' | 'dispatch'>,
    key: keyof T,
    next: (newValue: T[keyof T]) => void
) => (newValue: T[keyof T]) => void;

const stores: Record<string, Store<any>> = {};
const globalMiddlewares: Middleware<any>[] = [];

export const use = (middleware: Middleware<any>) => {
  globalMiddlewares.push(middleware);
}

export function createStore<T extends object>(initialState: T, storeId: string): Store<T> {
  if (stores[storeId]) {
      throw new Error(`Store with id '${storeId}' already exists`);
  }

  const store = {} as Store<T>;
  let storeMiddlewares: Middleware<T>[] = [];
  let reducer: Reducer<T, any> | undefined;

  let currentState = initialState;

  const dispatch = (action: Action) => {
      if (!reducer) {
          throw new Error(`No reducer provided for store '${storeId}'`);
      }

      const newState = reducer(currentState, action);

      for (const key in newState) {
          if (!deepEqual(newState[key], currentState[key])) {
              const setter = (store[key as keyof T] as [any, (newValue: any) => void])[1];
              setter && setter(newState[key]);
          }
      }

      currentState = newState;
  };

  for (const key in initialState) {
      const [getter, setter] = useState(initialState[key], `${storeId}_${key}`);

      const enhancedSetter = (newValue: T[keyof T]) => {
          if (!deepEqual(getter(), newValue)) {
              let dispatchFunc: (newValue: T[any]) => void = setter;
              [...globalMiddlewares, ...storeMiddlewares].forEach(mw => {
                  dispatchFunc = mw(store, key, dispatchFunc);
              });
              dispatchFunc(newValue);
          }
      };

      (store[key as keyof T] as any) = [getter, enhancedSetter];
  }

  store.use = (middlewareOrReducer: Middleware<T> | Reducer<T, any>) => {
      if (typeof middlewareOrReducer === 'function' && middlewareOrReducer.length === 2) {
          reducer = middlewareOrReducer as Reducer<T, any>;
      } else {
          storeMiddlewares.push(middlewareOrReducer as Middleware<T>);
      }
  };

  store.dispatch = dispatch;

  stores[storeId] = store;

  return store;
}

export const useStore = <T, K extends Exclude<keyof T, 'dispatch' | 'use'>>(
    store: Store<T>,
    key: K
): Store<T>[keyof T] => {
    return store[key];
}

export function createAction<P = void, T extends string = string>(
  type: T
): (...args: P extends void ? [] : [P]) => Action<P> {
  return (payload?: P) => ({ type, payload });
}

export const loggerMiddleware: Middleware<any> = (store, key, next) => (newValue) => {
  console.log(`Key '${String(key)}' updated with value:`, newValue);
  next(newValue);
};

export const thunkMiddleware: Middleware<any> = (store, key, next) => {
    return (action) => {
      if (typeof action === 'function') {
        return action(store.dispatch, store.getState);
      }
      return next(action);
    };
};
