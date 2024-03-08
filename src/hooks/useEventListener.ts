import React, { useEffect } from 'react';

import { EventEmitter } from 'react-native';

export function makeEventNotifier<P>(name: string) {
  return {
    name,
    notify: (param: P) => {
      EventEmitter.notify(name, param);
    },
    useEventListener: (listener: (param: P) => void, deps: readonly any[]) =>
      useEventListener(name, listener, deps),
  };
}

function useEventListener<T extends (...params: any) => void>(
  event: string,
  listener: T,
  deps: readonly any[],
) {
  useEffect(() => {
    EventEmitter.addListener(event, listener);
    return () => {
      EventEmitter.removeListener(event, listener);
    };
  }, deps);
}
