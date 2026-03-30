import Foundation
import CioMessagingPushFCM
import CioDataPipelines
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

  /// Re-forwards the current FCM token to Customer.io via both the
  /// MessagingPush module and the DataPipelines direct registration.
  /// Call from JS after CustomerIO.initialize() and CustomerIO.identify().
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

    // Route 1: Forward through MessagingPush (the standard FCM path)
    MessagingPush.shared.messaging(messaging, didReceiveRegistrationToken: token)

    // Route 2: Register directly with the DataPipelines SDK as a fallback
    CustomerIO.shared.registerDeviceToken(token)

    resolve(true)
  }
}
