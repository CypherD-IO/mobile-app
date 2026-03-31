import Foundation
import CioMessagingPushFCM
import FirebaseMessaging

/// React Native native module that exposes Customer.io push token
/// refresh to the JS layer. This is needed because the FCM token
/// delegate fires before the JS-initialized SDK is ready, so we
/// re-forward the cached FCM token through MessagingPush after
/// the SDK is fully initialised and the user is identified.
@objc(CioPushBridge)
class CioPushBridge: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }

  /// Re-forwards the current FCM token to Customer.io via the
  /// MessagingPush module. Call from JS after CustomerIO.initialize()
  /// and CustomerIO.identify() have completed.
  @objc(refreshPushToken:rejecter:)
  func refreshPushToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let messaging = Messaging.messaging()

    guard let token = messaging.fcmToken else {
      resolve(false)
      return
    }

    MessagingPush.shared.messaging(messaging, didReceiveRegistrationToken: token)
    resolve(true)
  }
}
