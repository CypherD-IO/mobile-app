import React, { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  CyDSafeAreaView,
  CyDScrollView,
  CyDView,
} from '../../styles/tailwindComponents';
import { screenTitle } from '../../constants';
import { getDaysRemaining } from '../../constants/winddown';
import { useSunset } from '../../store/sunsetStore';
import { useWindDownDates } from './hooks/useWindDownDates';
import useWinddownSteps from './hooks/useWinddownSteps';
import WinddownHeaderCard from './components/WinddownHeaderCard';
import WinddownInfoBanner from './components/WinddownInfoBanner';
import WinddownStepCard from './components/WinddownStepCard';
import SunsetCompletionOverlay from './components/SunsetCompletionOverlay';
import { shouldShowCompletion } from './components/sunsetCompletion';

/**
 * Winddown ("sunset") Home landing — the default tab for all users. Guides the
 * user through moving out funds, rewards and wallet before shutdown.
 */
export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { isSunsetEnabled } = useSunset();
  const dates = useWindDownDates();
  const { steps, completedCount, totalCount } = useWinddownSteps();

  // Session-scoped dismiss for the "You're all set" overlay.
  const [completionDismissed, setCompletionDismissed] = useState(false);

  // Scroll-to-next-step: each step card reports its Y offset within the scroll
  // content, so tapping "Steps Completed" can jump to the first pending step.
  const scrollRef = useRef<ScrollView>(null);
  const stepOffsets = useRef<Record<string, number>>({});

  const scrollToNextStep = (): void => {
    const nextStep = steps.find(step => step.isPrimary);
    const y = nextStep ? stepOffsets.current[nextStep.id] : undefined;
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }
  };

  const daysRemaining = getDaysRemaining(dates.shutdown);
  const showBanner = steps.some(step => step.id === 'withdraw');
  const showCompletion = shouldShowCompletion(
    isSunsetEnabled,
    completedCount,
    totalCount,
    completionDismissed,
  );

  return (
    <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
      <CyDScrollView
        ref={scrollRef}
        className='flex-1 px-[16px]'
        showsVerticalScrollIndicator={false}>
        <CyDView className='h-[12px]' />

        <WinddownHeaderCard
          daysRemaining={daysRemaining}
          completedCount={completedCount}
          totalCount={totalCount}
          shutdownDate={dates.shutdown}
          dates={dates}
          onStepsPress={scrollToNextStep}
          onLearnMore={() =>
            navigation.navigate(screenTitle.WINDDOWN_LEARN_MORE)
          }
        />

        {showBanner ? <WinddownInfoBanner /> : null}

        {steps.map(step => (
          <CyDView
            key={step.id}
            onLayout={event => {
              stepOffsets.current[step.id] = event.nativeEvent.layout.y;
            }}>
            <WinddownStepCard step={step} />
          </CyDView>
        ))}

        {/* Bottom padding so the last card clears the tab bar */}
        <CyDView className='h-[100px]' />
      </CyDScrollView>

      <SunsetCompletionOverlay
        visible={showCompletion}
        onClose={() => setCompletionDismissed(true)}
      />
    </CyDSafeAreaView>
  );
}
