import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { CyDBottomSheet, CyDBottomSheetRef } from './bottomSheet';
import { Platform } from 'react-native';

interface BottomSheetConfig {
  id: string;
  title?: string;
  snapPoints?: Array<string | number>;
  showCloseButton?: boolean;
  scrollable?: boolean;
  content: React.ReactNode;
  backgroundColor?: string;
  onClose?: () => void;
  onOpen?: () => void;
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

  // Handle pending presentations after render
  useEffect(() => {
    if (pendingPresentations.length > 0) {
      pendingPresentations.forEach(id => {
        const ref = bottomSheetRefs.current[id];
        if (ref) {
          const delay = Platform.OS === 'android' ? 400 : 100;
          setTimeout(() => {
            ref.present();
          }, delay);
        }
      });
      setPendingPresentations([]);
    }
  }, [pendingPresentations, bottomSheets]);

  const showBottomSheet = (config: BottomSheetConfig) => {
    console.log('GlobalBottomSheetProvider: Showing bottom sheet:', config.id);

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

    // Mark for presentation after render and layout
    setPendingPresentations(prev => {
      if (!prev.includes(config.id)) {
        return [...prev, config.id];
      }
      return prev;
    });
  };

  const hideBottomSheet = (id: string) => {
    console.log('GlobalBottomSheetProvider: Hiding bottom sheet:', id);
    bottomSheetRefs.current[id]?.dismiss();
  };

  const hideAllBottomSheets = () => {
    console.log('GlobalBottomSheetProvider: Hiding all bottom sheets');
    Object.values(bottomSheetRefs.current).forEach(ref => {
      ref?.dismiss();
    });
  };

  const handleBottomSheetClose = (id: string) => {
    console.log('GlobalBottomSheetProvider: Bottom sheet closed:', id);

    // Find the config and call its onClose callback
    const config = bottomSheets.find(sheet => sheet.id === id);
    config?.onClose?.();

    // Remove from state
    setBottomSheets(prev => prev.filter(sheet => sheet.id !== id));

    // Clean up ref
    delete bottomSheetRefs.current[id];
    delete layoutReady.current[id];
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
            }
          }}
          snapPoints={config.snapPoints || ['80%', '95%']}
          initialSnapIndex={-1}
          title={config.title}
          backgroundColor={config.backgroundColor}
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
