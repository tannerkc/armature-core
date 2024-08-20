// export class Signal<T> {
//     private value: T;
//     private listeners: Set<() => void> = new Set();

//     constructor(value: T) {
//         this.value = value;
//     }

//     get(): T {
//         return this.value;
//     }

//     set(newValue: T) {
//         if (newValue !== this.value) {
//             this.value = newValue;
//             this.notify();
//         }
//     }

//     subscribe(listener: () => void) {
//         this.listeners.add(listener);
//     }

//     unsubscribe(listener: () => void) {
//         this.listeners.delete(listener);
//     }

//     private notify() {
//         this.listeners.forEach(listener => listener());
//     }
// }

// export function createSignal<T>(initialValue: T): [() => T, (value: T) => void] {
//     const signal = new Signal(initialValue);
//     return [() => signal.get(), (value: T) => signal.set(value)];
// }



type Subscriber<T> = (value: T) => void;

export class Signal<T> {
    private _value: T;
    private subscribers: Set<Subscriber<T>> = new Set();

    constructor(value: T) {
        this._value = value;
    }

    get value(): T {
        return this._value;
    }

    set value(newValue: T) {
        if (this._value !== newValue) {
            this._value = newValue;
            this.notify();
        }
    }

    subscribe(subscriber: Subscriber<T>): () => void {
        this.subscribers.add(subscriber);
        return () => this.subscribers.delete(subscriber);
    }

    private notify() {
        for (const subscriber of this.subscribers) {
            subscriber(this._value);
        }
    }
}
