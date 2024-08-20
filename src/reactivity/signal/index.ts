export class Signal<T> {
    private value: T;
    private listeners: Set<() => void> = new Set();

    constructor(value: T) {
        this.value = value;
    }

    get(): T {
        return this.value;
    }

    set(newValue: T) {
        if (newValue !== this.value) {
            this.value = newValue;
            this.notify();
        }
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
    }

    unsubscribe(listener: () => void) {
        this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener());
    }
}

export function createSignal<T>(initialValue: T): [() => T, (value: T) => void] {
    const signal = new Signal(initialValue);
    return [() => signal.get(), (value: T) => signal.set(value)];
}
