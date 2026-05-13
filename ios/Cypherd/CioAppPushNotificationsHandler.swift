import CioMessagingPushFCM
import CioFirebaseWrapper
import FirebaseMessaging
import Foundation

/// Bridges the Customer.io Swift SDK to the Objective-C AppDelegate.
/// Handles push click events and FCM token forwarding for Customer.io.
@objc
public class CioAppPushNotificationsHandler: NSObject {

  public override init() {}

  /// Initializes the Customer.io MessagingPushFCM module to automatically
  /// handle push notification click events that originate from Customer.io.
  @objc(setupCustomerIOClickHandling)
  public func setupCustomerIOClickHandling() {
    MessagingPushFCM.initialize(withConfig: MessagingPushConfigBuilder().build())
  }

  /// Forwards FCM registration tokens to Customer.io so it can
  /// associate this device with the identified user.
  @objc(didReceiveRegistrationToken:fcmToken:)
  public func didReceiveRegistrationToken(
    _ messaging: Messaging,
    didReceiveRegistrationToken fcmToken: String?
  ) {
    MessagingPush.shared.messaging(messaging, didReceiveRegistrationToken: fcmToken)
  }
}
