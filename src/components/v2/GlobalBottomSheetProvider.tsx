import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { CyDBottomSheet, CyDBottomSheetRef } from './bottomSheet';
import { Platform, InteractionManager } from 'react-native';

interface BottomSheetConfig {
  id: string;
  title?: string;
  snapPoints?: Array<string | number>;
  showCloseButton?: boolean;
  /**
   * Controls whether the native BottomSheet handle (the top bar + indicator) is shown.
   * When set to false, the sheet is still draggable via content panning gestures.
   */
  showHandle?: boolean;
  scrollable?: boolean;
  content: React.ReactNode;
  backgroundColor?: string;
  onClose?: () => void;
  onOpen?: () => void;
  topBarColor?: string;
}

interface GlobalBottomSheetContextType {
  showBottomSheet: (config: BottomSheetConfig) => void;
  hideBottomSheet: (id: string) => void;
  hideAllBottomSheets: () => void;
}

const GlobalBottomSheetContext = createContext<
  GlobalBottomSheetContextType | undefined
>(undefined);

export const useGlobalBottomSheet = () => {
  const context = useContext(GlobalBottomSheetContext);
  if (!context) {
    throw new Error(
      'useGlobalBottomSheet must be used within a GlobalBottomSheetProvider',
    );
  }
  return context;
};

interface GlobalBottomSheetProviderProps {
  children: React.ReactNode;
}

export const GlobalBottomSheetProvider: React.FC<
  GlobalBottomSheetProviderProps
> = ({ children }) => {
  const [bottomSheets, setBottomSheets] = useState<BottomSheetConfig[]>([]);
  const [pendingPresentations, setPendingPresentations] = useState<string[]>(
    [],
  );
  const bottomSheetRefs = useRef<{ [key: string]: CyDBottomSheetRef | null }>(
    {},
  );
  const layoutReady = useRef<{ [key: string]: boolean }>({});

  /**
   * New, simpler presentation strategy:
   * -----------------------------------
   * Present the sheet immediately when its `ref` becomes available the first
   * time after (re-)mount.  This guarantees there is no race between the
   * layout and the `present()` call and removes the need for an intermediate
   * queue.
   */
  useEffect(() => {
    if (pendingPresentations.length === 0) {
      return;
    }

    setPendingPresentations(prevQueue => {
      const nextQueue: string[] = [];

      prevQueue.forEach(id => {
        const ref = bottomSheetRefs.current[id];

        if (!ref) {
          // Ref not ready yet -> keep it for the next render cycle
          nextQueue.push(id);
          return;
        }

        const delay = Platform.OS === 'android' ? 400 : 100;

        setTimeout(() => {
          // Protect against unmounted refs
          bottomSheetRefs.current[id]?.present();
        }, delay);
      });

      return nextQueue; // Only keep ids that still need to be presented
    });
  }, [pendingPresentations, bottomSheets]);

  const showBottomSheet = (config: BottomSheetConfig) => {
    // Add or update the bottom sheet
    setBottomSheets(prev => {
      const existing = prev.find(sheet => sheet.id === config.id);
      if (existing) {
        // Update existing
        return prev.map(sheet => (sheet.id === config.id ? config : sheet));
      } else {
        // Add new
        return [...prev, config];
      }
    });

    // No queue needed any more.
  };

  const hideBottomSheet = (id: string) => {
    bottomSheetRefs.current[id]?.dismiss();
  };

  const hideAllBottomSheets = () => {
    Object.values(bottomSheetRefs.current).forEach(ref => {
      ref?.dismiss();
    });
  };

  const handleBottomSheetClose = (id: string) => {
    // Find the config and call its onClose callback
    const config = bottomSheets.find(sheet => sheet.id === id);
    config?.onClose?.();

    // Remove from state
    setBottomSheets(prev => prev.filter(sheet => sheet.id !== id));

    // Clean up ref
    bottomSheetRefs.current[id] = null;
    layoutReady.current[id] = false;
  };

  const contextValue: GlobalBottomSheetContextType = {
    showBottomSheet,
    hideBottomSheet,
    hideAllBottomSheets,
  };

  return (
    <GlobalBottomSheetContext.Provider value={contextValue}>
      {children}

      {/* Render all active bottom sheets at root level */}
      {bottomSheets.map(config => (
        <CyDBottomSheet
          key={config.id}
          ref={ref => {
            if (ref) {
              bottomSheetRefs.current[config.id] = ref;

              // Present only once per mount
              if (!layoutReady.current[config.id]) {
                layoutReady.current[config.id] = true;

                void InteractionManager.runAfterInteractions(() => {
                  const present = () => {
                    bottomSheetRefs.current[config.id]?.present();
                  };

                  // Delay by 2 animation frames to ensure layout/measurements complete
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      present();

                      // Fallback retry after 120 ms in case first call is ignored (Android edge-case)
                      setTimeout(() => {
                        present();
                      }, 120);
                    });
                  });
                });
              }
            }
          }}
          snapPoints={config.snapPoints ?? ['80%', '95%']}
          initialSnapIndex={-1}
          title={config.title}
          topBarColor={config.topBarColor}
          backgroundColor={config.backgroundColor}
          showHandle={config.showHandle ?? true}
          showCloseButton={config.showCloseButton ?? true}
          scrollable={config.scrollable ?? true}
          onClose={() => handleBottomSheetClose(config.id)}
          onOpen={config.onOpen}>
          {config.content}
        </CyDBottomSheet>
      ))}
    </GlobalBottomSheetContext.Provider>
  );
};
