import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
} from 'react-native';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindComponents';
import Button from './v2/button';
import { ButtonType } from '../constants/enum';

interface TermsAndConditionsModalProps {
  isModalVisible: boolean;
  setShowModal: (visible: boolean) => void;
  onAcceptTerms: () => Promise<void>;
  title?: string;
}

export default function TermsAndConditionsModal({
  isModalVisible,
  setShowModal,
  onAcceptTerms,
  title = 'Terms and Conditions',
}: TermsAndConditionsModalProps): JSX.Element {
  const [isAccepted, setIsAccepted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] =
    useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  /**
   * Handles the acceptance of terms and conditions
   * Calls the parent callback and closes the modal
   */
  const handleAcceptTerms = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await onAcceptTerms();
      setShowModal(false);
      resetScrollState();
    } catch (error) {
      console.error('Error accepting terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the modal close action
   * Resets the checkbox and scroll state when modal is closed
   */
  const handleCloseModal = (visible: boolean): void => {
    setShowModal(visible);
    if (!visible) {
      resetScrollState();
    }
  };

  /**
   * Toggles the checkbox state for terms acceptance
   */
  const toggleAcceptance = (): void => {
    setIsAccepted(!isAccepted);
  };

  /**
   * Handles scroll events to detect when user reaches bottom
   */
  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  /**
   * Scrolls to the bottom of the terms content
   */
  const scrollToBottom = (): void => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  /**
   * Resets scroll state when modal is opened/closed
   */
  const resetScrollState = (): void => {
    setHasScrolledToBottom(false);
    setIsAccepted(false);
  };

  return (
    <Modal
      visible={isModalVisible}
      transparent={false}
      animationType='slide'
      presentationStyle='formSheet'
      statusBarTranslucent={false}
      onRequestClose={() => handleCloseModal(false)}>
      <CyDView className='flex-1'>
        <CyDView className='bg-n0 h-full'>
          {/* Header Section */}
          <CyDView className='flex-row items-center justify-between px-[20px] py-[16px] border-b border-n20'>
            <CyDText className='text-[20px] font-bold text-center flex-1'>
              {title}
            </CyDText>
            <CyDTouchView
              onPress={() => handleCloseModal(false)}
              className='p-[4px]'>
              <CyDMaterialDesignIcons
                name='close'
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>

          {/* Content Container */}
          <CyDView className='flex-1 relative'>
            {/* Scrollable Content Section */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.scrollContent}>
              <CyDView className='px-[20px] pt-[16px]'>
                <CyDText className='text-[14px] leading-[20px] text-base400'>
                  <CyDText className='text-[16px] font-bold text-base400 mb-[12px]'>
                    Important Disclaimers and Acknowledgement of Terms of Use
                    for the Airdrop Checker
                  </CyDText>
                  {'\n'}
                  Please Read Carefully Before Checking Your Eligibility for the
                  CYPR Token Airdrop.
                  {'\n\n'}
                  By clicking the &quot;Accept&quot; button below and using the
                  CYPR tokens (the &quot;Tokens&quot;) airdrop eligibility
                  checker (&quot;Airdrop Checker&quot;), you acknowledge and
                  agree to the following:
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Applicable Terms and Conditions
                  </CyDText>
                  {'\n'}
                  Your access and use of the Airdrop Checker is governed by and
                  subject to (i) the CYPR Airdrop Terms and Conditions
                  (&quot;Airdrop Terms&quot;) and (ii) the General Terms of
                  Cypher Protocol Ltd.&apos;s (the &quot;Company&quot;) website
                  accessible at https://cypherhq.io/legal/ (&quot;General
                  Terms&quot;). By clicking the &quot;Accept&quot; button below,
                  you acknowledge and confirm that you have read and understood
                  the Airdrop Terms and the General Terms, and that you agree to
                  be bound by the Airdrop Terms and General Terms in respect of
                  your access and use of the Airdrop Checker.
                  {'\n\n'}
                  For avoidance of doubt, the Company is solely responsible for
                  the Airdrop Programme and shall not be affiliated with any
                  other entity for matters relating to the Tokens, any Airdrop
                  Round, Airdrop Terms, the Airdrop Programme, or the Airdrop
                  Site.
                  {'\n\n'}
                  Capitalised terms herein shall have the meaning given to them
                  in the Airdrop Terms, unless the context requires otherwise.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Purpose and Limitations
                  </CyDText>
                  {'\n'}
                  The Airdrop Checker is an informational tool provided solely
                  to assist in assessing your preliminary eligibility for the
                  CYPR Token airdrop programme. For the purposes of this
                  disclaimer, &quot;Cypher Card Spenders&quot; refers to
                  individuals or entities that have engaged in spending
                  activities using a Cypher Card, with allocations proportional
                  to spending volume, and &quot;Aerodrome Vote Lockers&quot;
                  refers to individuals or entities that have locked tokens for
                  voting on the Aerodrome platform, subject to minimum lock
                  amount or duration requirements. Results displayed by the
                  Airdrop Checker do not guarantee final eligibility,
                  participation, or any right to receive Tokens or rewards. We
                  reserve the right to disqualify participants who are suspected
                  of fraudulent or illegal activities, bypassing eligibility
                  checks, or failing to meet any eligibility criteria, such as
                  being Cypher Card Spenders or Aerodrome Vote Lockers. We
                  reserve the right to change our decisions (and accordingly,
                  any results displayed by the Airdrop Checker) on or prior to
                  the occurrence of the airdrop.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    No Guarantees or Warranties
                  </CyDText>
                  {'\n'}
                  The Airdrop Checker is provided &quot;as is&quot; without
                  warranties, express or implied, regarding accuracy,
                  completeness, currentness or fitness for a particular purpose.
                  We are not liable for any errors, omissions, or potential
                  inaccuracies in the eligibility assessment provided by the
                  Airdrop Checker, nor for any decisions or changes made on or
                  prior to the occurrence of the airdrop that affect the results
                  or accuracy of the eligibility assessment provided by the
                  Airdrop Checker.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Privacy and Data Usage
                  </CyDText>
                  {'\n'}
                  We may collect certain information relating to you when you
                  participate in the Airdrop Programme or claim your Tokens,
                  such as your wallet addresses or your past interactions with
                  the Cypher project and ecosystem, and the range of services
                  and products that we provide, to assess your eligibility for
                  the Token airdrop. For more information on how your data may
                  be collected, used, disclosed and/or processed, please refer
                  to our Privacy Policy accessible at
                  https://cypherhq.io/legal/. You hereby consent to the
                  collection, usage, disclosure and processing of information
                  relating to you, including without limitation, your personal
                  data, in accordance with our Privacy Policy.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    User Responsibility and Security
                  </CyDText>
                  {'\n'}
                  Please note that it is your responsibility to ensure the
                  security of your wallets, private keys, and other credentials
                  when using the Airdrop Checker. We will never request your
                  private keys, wallet seed phrases, or sensitive account
                  information.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Assumption of Risk
                  </CyDText>
                  {'\n'}
                  By using the Airdrop Checker, you assume all risks associated
                  with its use and your reliance on its results. This tool is
                  intended to provide general guidance only, and any actions you
                  take based on its output are at your own risk.
                  {'\n\n'}
                  If you do not accept any of these terms, you may not use the
                  Airdrop Checker.
                  {'\n\n'}
                  {'\n\n'}
                  <CyDText className='text-[16px] font-bold text-base400 mb-[12px]'>
                    Important Disclaimer
                  </CyDText>
                  {'\n'}
                  Please Read Carefully Before Participating in the CYPR Token
                  Airdrop Programme.
                  {'\n\n'}
                  By participating in the CYPR Token Airdrop Programme, and
                  proceeding with the claim for the Tokens under the Airdrop
                  Programme, you acknowledge and agree to the following:
                  {'\n\n'}
                  Participation in the Airdrop Programme and the claiming of any
                  Tokens pursuant thereto is subject to acceptance of the
                  following, and by continuing and clicking the
                  &quot;Accept&quot; button below, you confirm that you have
                  read, understood, and accepted all the following terms:
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Applicable Terms and Conditions
                  </CyDText>
                  {'\n'}
                  Your participation in the Airdrop Programme and the claiming
                  of Tokens under the Airdrop Programme is governed by and
                  subject to (i) the CYPR Airdrop Terms and Conditions
                  (&quot;Airdrop Terms&quot;), which govern eligibility,
                  participation, distribution, and any associated terms for this
                  Airdrop Programme, and (ii) the General Terms of Cypher
                  Protocol Ltd.&apos;s (the &quot;Company&quot;) website
                  accessible at https://cypherhq.io/legal/ (&quot;General
                  Terms&quot;). By clicking the &quot;Accept&quot; button below,
                  you acknowledge and confirm that you have read and understood
                  the Airdrop Terms and the General Terms, and that you agree to
                  be bound by the Airdrop Terms and General Terms in respect of
                  your participation in the Airdrop Programme and the claiming
                  of the Tokens pursuant thereto.
                  {'\n\n'}
                  For avoidance of doubt, the Company is solely responsible for
                  the Airdrop Programme and shall not be affiliated with any
                  other entity for matters relating to the Tokens, any Airdrop
                  Round, Airdrop Terms, the Airdrop Programme, or the Airdrop
                  Site.
                  {'\n\n'}
                  Capitalised terms herein shall have the meaning given to them
                  in the Airdrop Terms, unless the context requires otherwise.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Jurisdictional Limitation
                  </CyDText>
                  {'\n'}
                  The Airdrop Programme is subject to applicable laws and
                  regulations and may not be available to residents of certain
                  jurisdictions. By claiming the CYPR tokens
                  (&quot;Tokens&quot;), you warrant that (i) you are in
                  compliance with all applicable laws regarding digital assets;
                  (ii) you are not residing, domiciled or incorporated in any of
                  the jurisdictions prohibited in the Airdrop Terms; and (iii)
                  agree not to participate if such participation is restricted
                  or prohibited in your jurisdiction. We reserve the right to
                  refuse or revoke access to the Airdrop Programme in any
                  location where distribution is restricted.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Tax Obligation
                  </CyDText>
                  {'\n'}
                  Your receipt of tokens through the Airdrop Programme may be
                  considered a taxable event under the laws of your jurisdiction
                  and you may be required to report the receipt of such tokens.
                  It is your responsibility to understand and comply with any
                  tax obligations that may arise from receiving or holding
                  tokens through this Airdrop Programme. We will not be
                  responsible for advising on or fulfilling your tax
                  obligations.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Risks Warning
                  </CyDText>
                  {'\n'}
                  In addition to the nonexclusive list of risk disclaimers set
                  out in our Airdrop Terms, you acknowledge and accept the
                  market and security risks associated with your participation
                  in our Airdrop Programme. The value of the Tokens distributed
                  via the Airdrop Programme may be highly volatile and subject
                  to significant fluctuations in response to market conditions,
                  and your claiming of tokens through the Airdrop Programme may
                  involve risks of network failures, delays, and security
                  vulnerabilities.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Transferability and Liquidity Limitations
                  </CyDText>
                  {'\n'}
                  The Tokens distributed in the Airdrop Programme may not be
                  immediately transferable, and we make no guarantees regarding
                  their tradability or liquidity on secondary markets.
                  Transferability may be subject to future updates, regulatory
                  limitations, network changes, or third-party restrictions. Any
                  future ability to transfer, sell, or trade these Tokens is not
                  assured and may depend on factors outside of our control.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    User Responsibility and Security
                  </CyDText>
                  {'\n'}
                  You are solely responsible for maintaining the security of
                  your private keys, wallet credentials, and device. We will not
                  be liable for any losses resulting from any unauthorised
                  access, loss of keys, or compromised wallet security.
                  {'\n\n'}
                  <CyDText className='text-[15px] font-semibold text-base400'>
                    Privacy and Data Usage
                  </CyDText>
                  {'\n'}
                  We may collect certain information relating to you when you
                  participate in the Airdrop Programme or claim your Tokens,
                  such as your wallet addresses or your past interactions with
                  the Cypher project and ecosystem, and the range of services
                  and products that we provide, to assess your eligibility for
                  the Token airdrop. For more information on how your data may
                  be collected, used, disclosed and/or processed, please refer
                  to our Privacy Policy accessible at
                  https://cypherhq.io/legal/. You hereby consent to the
                  collection, usage, disclosure and processing of information
                  relating to you, including without limitation, your personal
                  data, in accordance with our Privacy Policy.
                  {'\n\n'}
                  If you do not accept any of these terms, you may not proceed
                  with the claim.
                </CyDText>
              </CyDView>
            </ScrollView>

            {/* Floating Scroll to Bottom Button */}
            {!hasScrolledToBottom && (
              <CyDView className='absolute bottom-[20px] right-[20px] z-10'>
                <CyDTouchView
                  onPress={scrollToBottom}
                  className='bg-buttonColor rounded-full p-[16px] shadow-lg'>
                  <CyDMaterialDesignIcons
                    name='arrow-down'
                    size={24}
                    className='text-black'
                  />
                </CyDTouchView>
              </CyDView>
            )}
          </CyDView>

          {/* Bottom Section with Checkbox and Button - Only show when scrolled to bottom */}
          {hasScrolledToBottom && (
            <CyDView className='px-[20px] pt-[16px] pb-[32px] border-t border-n20 bg-n0'>
              {/* Checkbox Section */}
              <CyDTouchView
                onPress={toggleAcceptance}
                className='flex-row items-center mb-[16px] p-[12px] bg-n40 rounded-[16px]'>
                <CyDView
                  className={`h-[20px] w-[20px] ${
                    isAccepted ? 'bg-p100' : 'bg-base150'
                  } rounded-[4px] flex items-center justify-center mr-[12px]`}>
                  {isAccepted && (
                    <CyDMaterialDesignIcons
                      name='check'
                      size={14}
                      className='text-white'
                    />
                  )}
                </CyDView>
                <CyDText className='text-[14px] font-medium text-base400 flex-1'>
                  I agree with the privacy policy and terms and conditions
                  listed above.
                </CyDText>
              </CyDTouchView>

              {/* Continue Button */}
              <Button
                onPress={() => {
                  void handleAcceptTerms();
                }}
                type={ButtonType.PRIMARY}
                title='Continue'
                disabled={!isAccepted}
                loading={isLoading}
                style='rounded-full'
                titleStyle='text-[16px] font-bold'
              />
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
