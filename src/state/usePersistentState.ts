import { generateUniqueId } from "../lib/generateId";

let currentSubscriber: Function | null = null;
export const usePersistentState = <T>(key: string, initialValue?: T): [
    (() => T | undefined),
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

            let signalElements = document.querySelectorAll(`[data-signal-id='${signature}']`)
            if (signalElements) signalElements.forEach(signalElement => {
                signalElement.innerHTML = (newValue as any).toString()
            })
        }
    }

    return [get, set];
}
