import { Signal } from "effective-jsx";


export function useState<T>(initialValue: T): [() => T, (newValue: T) => void] {
    const signal = new Signal(initialValue);

    const getValue = () => signal.value;
    const setValue = (newValue: T) => {
        signal.value = newValue;
    };

    return [getValue, setValue];
}
