import React, { ReactNode } from 'react';
import {
  NavigationState,
  SceneRendererProps,
  TabView,
  TabViewProps,
} from 'react-native-tab-view';

export interface TabRoute {
  key: string;
  title: string;
}

export interface PortfolioTabViewProps
  extends Pick<TabViewProps<TabRoute>, 'renderScene'> {
  routes: TabRoute[];
  width: number;
  index: number;
  setIndex: (i: number) => void;
  renderTabBar: (
    props: SceneRendererProps & {
      navigationState: NavigationState<TabRoute>;
      setIndex: (i: number) => void;
    }
  ) => ReactNode;
  swipeEnabled?: boolean;
}

export const PortfolioTabView = ({
  routes,
  width,
  renderTabBar,
  index,
  setIndex,
  renderScene,
  swipeEnabled = true,
}: PortfolioTabViewProps) => {
  return (
    <TabView
      lazy
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={(p) =>
        renderTabBar({
          ...p,
          setIndex,
        })
      }
      onIndexChange={setIndex}
      initialLayout={{ width }}
      swipeEnabled={swipeEnabled}
    />
  );
};
