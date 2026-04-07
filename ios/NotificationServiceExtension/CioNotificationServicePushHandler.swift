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
    guard let cdpApiKey = Bundle.main.object(forInfoDictionaryKey: "CUSTOMERIO_CDP_API_KEY") as? String,
          !cdpApiKey.isEmpty else {
      print("[CioExtension] CUSTOMERIO_CDP_API_KEY missing from Info.plist — skipping rich push")
      contentHandler(request.content)
      return
    }

    MessagingPushFCM.initializeForExtension(
      withConfig: MessagingPushConfigBuilder(cdpApiKey: cdpApiKey)
        .build()
    )

    MessagingPush.shared.didReceive(request, withContentHandler: contentHandler)
  }

  @objc(serviceExtensionTimeWillExpire)
  public func serviceExtensionTimeWillExpire() {
    MessagingPush.shared.serviceExtensionTimeWillExpire()
  }
}
