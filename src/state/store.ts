// import { useEffect, useState } from ".";
// import { generateUniqueId } from "../utils/generateId";

// type Listener = () => void;
// type Middleware<T> = (store: Store<T>) => (next: (action: Action) => void) => (action: Action) => void;
// type Selector<T, R> = (state: T) => R;

// interface Action {
//   type: string;
//   payload?: any;
// }

// class Store<T extends object> {
//   private state: T;
//   private listeners: Set<Listener> = new Set();
//   private middleware: Middleware<T>[] = [];

//   constructor(initialState: T, private name: string) {
//     this.state = this.deepFreeze({ ...initialState });
//   }

//   getState(): Readonly<T> {
//     return this.state;
//   }

//   dispatch = (action: Action): void => {
//     const composedMiddleware = this.composeMiddleware();
//     composedMiddleware(action);
//   };

//   private setStateInternal = (newState: Partial<T>): void => {
//     this.state = this.deepFreeze({ ...this.state, ...newState });
//     this.notifyListeners();
//   };

//   subscribe(listener: Listener): () => void {
//     this.listeners.add(listener);
//     return () => this.listeners.delete(listener);
//   }

//   private notifyListeners(): void {
//     this.listeners.forEach((listener) => listener());
//   }

//   use(middleware: Middleware<T>): void {
//     this.middleware.push(middleware);
//   }

//   private composeMiddleware() {
//     return this.middleware.reduceRight(
//       (composed, m) => m(this)(composed),
//       (action: Action) => this.reducer(action)
//     );
//   }

//   private reducer = (action: Action): void => {
//     switch (action.type) {
//       case `${this.name}/setState`:
//         this.setStateInternal(action.payload);
//         break;
//       default:
//         break;
//     }
//   };

//   private deepFreeze<O>(obj: O): Readonly<O> {
//     Object.freeze(obj);
//     Object.getOwnPropertyNames(obj).forEach((prop) => {
//       if (
//         obj[prop] !== null &&
//         (typeof obj[prop] === "object" || typeof obj[prop] === "function") &&
//         !Object.isFrozen(obj[prop])
//       ) {
//         this.deepFreeze(obj[prop]);
//       }
//     });
//     return obj;
//   }
// }

// export function createStore<T extends object>(initialState: T, name: string): Store<T> {
//   return new Store<T>(initialState, name);
// }

// export function useStore<T extends object, R>(
//   store: Store<T>,
//   selector: Selector<T, R>
// ): [R, (action: Action) => void] {
//   const [, forceUpdate] = useState(0);

//   useEffect(() => {
//     const unsubscribe = store.subscribe(() => forceUpdate((v) => v + 1));
//     return unsubscribe;
//   }, [store]);

//   return [selector(store.getState()), store.dispatch];
// }

// // Middleware for logging
// export const loggerMiddleware: Middleware<any> = (store) => (next) => (action) => {
//   console.log('Dispatching:', action);
//   next(action);
//   console.log('New State:', store.getState());
// };

// // Middleware for handling async actions
// export const thunkMiddleware: Middleware<any> = (store) => (next) => (action) => {
//   if (typeof action === 'function') {
//     return action(store.dispatch, store.getState);
//   }
//   return next(action);
// };

// // Helper function to create actions
// export function createAction<P = void, T extends string = string>(
//   type: T
// ): (...args: P extends void ? [] : [P]) => Action {
//   return (payload?: P) => ({ type, payload });
// }

// // Re-export useState and useEffect from the original file
// export { useState, useEffect };
