export const KeychainErrors = {
  CODE_1: 'code: 1, msg: Fingerprint hardware not available.',
  CODE_8: 'code: 8, msg: Error authenticating',
  CODE_10: 'code: 10, msg: User cancelled', // Android back button
  CODE_11: 'code: 11, msg: No fingerprints enrolled.',
  CODE_13: 'code: 13, msg: Cancel', // Android cancel
  USERNAME_OR_PASSPHRASE_NOT_CORRECT:
    'The user name or passphrase you entered is not correct.',
  // iOS specific error codes
  IOS_USER_CANCEL: 'User canceled the operation.',
  IOS_USER_FALLBACK: 'User chose to enter password.',
  IOS_SYSTEM_CANCEL: 'System cancel',
  IOS_AUTHENTICATION_FAILED: 'Authentication failed',
  IOS_PASSCODE_NOT_SET: 'Passcode is not set on the device',
  IOS_BIOMETRY_NOT_AVAILABLE: 'Biometry is not available on the device',
  IOS_BIOMETRY_NOT_ENROLLED:
    'Authentication could not start, because biometry has no enrolled identities',
  IOS_BIOMETRY_LOCKOUT:
    'Authentication was not successful, because there were too many failed biometry attempts and biometry is now locked',
};
