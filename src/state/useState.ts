import { generateUniqueId } from "../lib/generateId";

let currentSubscriber: Function | null = null;
export const useState = (initialValue: any) => {
    let value = initialValue;
    const signature = generateUniqueId();
    const subscribers = new Set<Function>();
  
    const get = () => {
      if (currentSubscriber) {
        subscribers.add(currentSubscriber);
      }
      return value;
    }

    get.isGetter = true;
    get.signature = signature;
  
    const set = (newValue: any) => {
      if (value !== newValue) {
        value = newValue;
        subscribers.forEach(subscriber => subscriber());

        let signalElements = document.querySelectorAll(`[data-signal-id='${signature}']`)
        if(signalElements) signalElements.forEach(signalElement => {
            signalElement.innerHTML = newValue
        })
      }
    }
  
    return [get, set];
}
