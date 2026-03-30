import CioMessagingPushFCM
import Foundation
import UserNotifications

/// Bridges Customer.io rich push support (images, deep links) into the
/// Notification Service Extension via the CioMessagingPushFCM SDK.
@objc
public class CioNotificationServicePushHandler: NSObject {

  public override init() {}

  /// Initializes the Customer.io SDK for the extension context and delegates
  /// notification content modification (e.g. media attachments) to the SDK.
  @objc(didReceive:withContentHandler:)
  public func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    // The extension runs in a separate process, so the SDK must be
    // initialized independently with its own CDP API key.
    MessagingPushFCM.initializeForExtension(
      withConfig: MessagingPushConfigBuilder(cdpApiKey: "c7d94ba6ac97b07c3142")
        .build()
    )

    MessagingPush.shared.didReceive(request, withContentHandler: contentHandler)
  }

  /// Delivers the best-effort notification content when the system is about
  /// to terminate the extension before processing finishes.
  @objc(serviceExtensionTimeWillExpire)
  public func serviceExtensionTimeWillExpire() {
    MessagingPush.shared.serviceExtensionTimeWillExpire()
  }
}
