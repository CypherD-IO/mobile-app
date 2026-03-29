import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';
import { screenTitle } from '../../constants';

/**
 * Walks up the navigation tree to find the stack that registers BlindPay KYC.
 */
function findNavigatorWithRoute(
  navigation: NavigationProp<ParamListBase>,
  routeName: string,
): NavigationProp<ParamListBase> | null {
  let nav: NavigationProp<ParamListBase> | null = navigation;
  while (nav) {
    const routeNames = nav.getState()?.routeNames;
    if (routeNames?.includes(routeName)) {
      return nav;
    }
    nav = nav.getParent();
  }
  return null;
}

/**
 * Tab route name is `Portfolio` (screenTitle.PORTFOLIO). Portfolio *stack* route names
 * are things like `PortfolioScreen`, `blindpayKycStack` — never `Portfolio`, so never
 * use stack.routeNames.includes(PORTFOLIO) as a fallback.
 */
function navigatePortfolioTabToKyc(
  navigation: NavigationProp<ParamListBase>,
): boolean {
  const tabNav = navigation.getParent();
  if (!tabNav?.getState()?.routeNames?.includes(screenTitle.PORTFOLIO)) {
    return false;
  }
  tabNav.navigate(screenTitle.PORTFOLIO, {
    screen: screenTitle.BLINDPAY_KYC_STACK,
  });
  return true;
}

/** Push KYC (e.g. from intro when TOS already completed). */
export function navigateToBlindPayKycStack(
  navigation: NavigationProp<ParamListBase>,
): void {
  if (navigatePortfolioTabToKyc(navigation)) {
    return;
  }

  const stackNav = findNavigatorWithRoute(
    navigation,
    screenTitle.BLINDPAY_KYC_STACK,
  );
  if (stackNav) {
    stackNav.navigate(screenTitle.BLINDPAY_KYC_STACK, {});
    return;
  }

  navigation.navigate(screenTitle.BLINDPAY_KYC_STACK, {});
}

/** Replace current screen with KYC (e.g. after TOS WebView completes). */
export function replaceWithBlindPayKycStack(
  navigation: NavigationProp<ParamListBase>,
): void {
  const stackNav = findNavigatorWithRoute(
    navigation,
    screenTitle.BLINDPAY_KYC_STACK,
  );
  if (stackNav) {
    stackNav.dispatch(
      StackActions.replace(screenTitle.BLINDPAY_KYC_STACK, {}),
    );
    return;
  }

  if (navigatePortfolioTabToKyc(navigation)) {
    return;
  }

  navigation.navigate(screenTitle.BLINDPAY_KYC_STACK, {});
}
