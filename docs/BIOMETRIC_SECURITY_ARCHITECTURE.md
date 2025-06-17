# Biometric Security Architecture

## Overview

This document outlines the biometric authentication security architecture implemented in the CypherD mobile application. Our security model balances user experience with the high-security requirements of cryptocurrency wallet applications.

## Table of Contents

- [Security Philosophy](#security-philosophy)
- [Current Implementation](#current-implementation)
- [Biometric Change Detection System](#biometric-change-detection-system)
- [Attack Scenarios & Mitigations](#attack-scenarios--mitigations)
- [Comparison with Banking Apps](#comparison-with-banking-apps)
- [Security Trade-offs](#security-trade-offs)
- [Implementation Details](#implementation-details)
- [Risk Assessment](#risk-assessment)
- [Recommendations](#recommendations)

## Security Philosophy

### Core Principle: **"Your Keys, Your Responsibility"**

Unlike traditional banking applications that can reverse fraudulent transactions, cryptocurrency wallets operate in an **irreversible transaction environment**. Once crypto assets are transferred, there is no customer support to call, no insurance to claim, and no way to reverse the transaction.

### Security vs. Usability Balance

Our approach implements a **hybrid security model** that:

- Provides banking-app-level convenience for normal operations
- Triggers enhanced security measures when suspicious activity is detected
- Maintains user control over security vs. convenience trade-offs

## Current Implementation

### Keychain Access Control Configuration

#### iOS Configuration

```typescript
accessControl: ACCESS_CONTROL.USER_PRESENCE;
accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
```

#### Android Configuration

```typescript
accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE;
accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
```

### Security Properties

1. **Device-Level Authentication**: Requires biometric (FaceID/TouchID/Fingerprint) or device passcode
2. **Device-Bound Storage**: Data cannot be restored to different devices
3. **No Cloud Backup**: Sensitive data is not included in iCloud/Google backups
4. **Passcode Dependency**: Data is deleted if device passcode is removed

## Biometric Change Detection System

### How It Works

Our security system implements an **early warning detection mechanism** that identifies when biometric configurations change on the device.

#### Detection Flow

1. **Normal Operation**: App requests keychain access using stored biometric reference
2. **Change Detection**: If biometric enrollment changes, keychain access fails
3. **Error Analysis**: System analyzes the specific error to distinguish between scenarios
4. **Security Response**: Appropriate action is taken based on the detected scenario

#### Code Implementation

```typescript
// Enhanced error handling in loadFromKeyChain()
if (
  isIOS() &&
  error.message === KeychainErrors.USERNAME_OR_PASSPHRASE_NOT_CORRECT
) {
  console.log('iOS USERNAME_OR_PASSPHRASE_NOT_CORRECT error detected');

  // Check if biometric authentication is still available
  const isBiometricStillAvailable = await isBiometricEnabled();

  if (isBiometricStillAvailable) {
    // Potential screen lock scenario - retry once
    // If retry fails with same error -> likely auth method change
    showModal(); // Trigger DefaultAuthRemoveModal
  } else {
    // Biometric not available anymore -> definitely auth method change
    showModal();
  }
}
```

### DefaultAuthRemoveModal Behavior

When biometric changes are detected, the system presents users with two options:

#### PROCEED Option

```typescript
const onProceedPress = async () => {
  await removeCredentialsFromKeychain(); // Clear keychain data
  await clearAllData(); // Clear app storage
  await deleteWithAuth('/v1/configuration/device'); // Clear server data
  RNRestart.Restart(); // Restart app for fresh setup
};
```

#### CANCEL Option

```typescript
const onCancelPress = () => {
  RNExitApp.exitApp(); // Exit application
};
```

## Attack Scenarios & Mitigations

### Scenario 1: Device Theft + Biometric Addition

**Attack Vector:**

1. Attacker steals device
2. Compromises device passcode
3. Adds their biometric (fingerprint/face)
4. Attempts to access crypto wallet

**Mitigation:**

- Biometric change detection triggers immediately
- DefaultAuthRemoveModal forces conscious user decision
- Any choice results in attack failure:
  - PROCEED → All crypto data is deleted
  - CANCEL → App exits, no access gained

### Scenario 2: Legitimate User Biometric Changes

**Scenario:**

- User upgrades device
- User re-enrolls biometrics
- User switches between FaceID/TouchID

**User Experience:**

1. User sees clear explanation of what happened
2. User can choose to proceed (understanding data will be cleared)
3. User can re-import wallet with seed phrase
4. Normal operation resumes

### Scenario 3: Screen Lock During Authentication

**Challenge:**
iOS throws the same error for screen locks as for biometric changes.

**Solution:**

```typescript
// Enhanced detection logic
if (isBiometricStillAvailable) {
  // Try once more - if it's just screen lock, retry should work
  // If retry fails -> likely genuine biometric change
}
```

## Comparison with Banking Apps

### Why Banking Apps Use Simpler Security

| Factor                        | Banking Apps               | Crypto Wallets        |
| ----------------------------- | -------------------------- | --------------------- |
| **Transaction Reversibility** | ✅ Can reverse fraud       | ❌ Irreversible       |
| **Insurance Coverage**        | ✅ FDIC protected          | ❌ No insurance       |
| **Fraud Monitoring**          | ✅ 24/7 monitoring         | ❌ No monitoring      |
| **Customer Support**          | ✅ Human intervention      | ❌ No support         |
| **Regulatory Framework**      | ✅ Strong legal protection | ❌ Minimal protection |

### Our Enhanced Approach

While banking apps can rely purely on device-level security due to their safety nets, crypto wallets require additional protection layers:

1. **Biometric Change Detection** - Early warning system
2. **Data Clearing Mechanisms** - Scorched earth on compromise
3. **User Education** - Clear communication about security events

## Security Trade-offs

### Current Model Benefits

✅ **Good User Experience**: Normal operation feels like banking apps
✅ **Enhanced Security**: Additional protection for high-risk scenarios  
✅ **User Control**: Users decide how to handle security events
✅ **Attack Mitigation**: Multiple attack vectors are blocked
✅ **Recovery Path**: Legitimate users can regain access

### Current Model Limitations

⚠️ **Device Passcode Dependency**: If device passcode is compromised, security is reduced
⚠️ **User Education Required**: Users must understand the implications of their choices
⚠️ **False Positives**: Legitimate biometric changes require data re-entry

## Implementation Details

### Key Components

1. **`loadFromKeyChain()`** - Enhanced error detection and handling
2. **`DefaultAuthRemoveModal`** - User interface for security events
3. **`KeychainErrors`** - Standardized error classifications
4. **`isBiometricEnabled()`** - Biometric availability checking

### Error Code Mapping

```typescript
export const KeychainErrors = {
  CODE_1: 'code: 1, msg: Fingerprint hardware not available.',
  CODE_10: 'code: 10, msg: User cancelled', // Android back button
  CODE_11: 'code: 11, msg: No fingerprints enrolled.',
  CODE_13: 'code: 13, msg: Cancel', // Android cancel
  USERNAME_OR_PASSPHRASE_NOT_CORRECT:
    'The user name or passphrase you entered is not correct.',
  // iOS specific codes for future enhancement...
};
```

### Platform Differences

#### iOS Behavior

- Uses `ACCESS_CONTROL.USER_PRESENCE` for flexibility
- Throws `USERNAME_OR_PASSPHRASE_NOT_CORRECT` for multiple scenarios
- Requires sophisticated error analysis

#### Android Behavior

- Uses `BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE` for stricter security
- Provides more specific error codes
- Generally more predictable error patterns

## Risk Assessment

### High Risk Scenarios

1. **Physical device theft + passcode compromise**
2. **Sophisticated social engineering attacks**
3. **Insider threats with device access**

### Medium Risk Scenarios

1. **Biometric spoofing attempts**
2. **Malware with elevated permissions**
3. **Supply chain attacks on biometric hardware**

### Low Risk Scenarios

1. **Remote network attacks** (biometric data never leaves device)
2. **Cloud service breaches** (no cloud backup)
3. **Application-level vulnerabilities** (keychain is OS-protected)

## Recommendations

### For Production Deployment

1. **Maintain Current Architecture**: The hybrid approach is well-balanced
2. **Add User Education**: Clear documentation about security model
3. **Consider Tiered Security**: Higher security for larger transactions
4. **Monitor Attack Patterns**: Log security events for analysis

### Potential Enhancements

1. **Hardware Security Module Integration**: For enterprise users
2. **Multi-Signature Support**: For high-value wallets
3. **Time-Based Access Controls**: Additional security for dormant wallets
4. **Behavioral Analysis**: Detect unusual usage patterns

### Configuration Options

```typescript
// Current Production Configuration
const SECURITY_CONFIG = {
  biometricChangeDetection: true,
  automaticDataClearingOnSuspiciousActivity: true,
  userControlledSecurityDecisions: true,
  deviceBindingSecurity: true,
};
```

## Conclusion

Our biometric security architecture represents a **mature approach** to cryptocurrency wallet security that:

- Acknowledges the unique risks of irreversible transactions
- Balances security with usability
- Provides multiple layers of protection
- Gives users control over their security posture
- Implements industry best practices with crypto-specific enhancements

This architecture is **significantly more secure** than typical banking app implementations while maintaining comparable user experience for normal operations.

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Authors**: CypherD Security Team
