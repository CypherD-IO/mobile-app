import UIKit
import Foundation
import Lottie

@objc class Dynamic: NSObject {

  /// Creates and returns a Lottie animation view attached to the provided `rootView` geometry.
  ///
  /// Notes:
  /// - Lottie-iOS v4+ renamed `AnimationView` -> `LottieAnimationView`.
  /// - We keep the ObjC-exposed signature returning `UIView` to avoid bridging issues across Swift/ObjC/React Native.
  @objc func createAnimationView(rootView: UIView, lottieName: String) -> UIView {
    // Lottie-iOS v4+: `LottieAnimationView` is the primary view type.
    let animationView = LottieAnimationView(name: lottieName)
    animationView.frame = rootView.frame
    animationView.center = rootView.center
    animationView.backgroundColor = UIColor.black
    return animationView
  }

  /// Starts playing a previously-created Lottie animation view.
  ///
  /// We accept `UIView` to keep ObjC bridging stable; at runtime this must be a `LottieAnimationView`.
  @objc func play(animationView: UIView) {
    guard let lottieView = animationView as? LottieAnimationView else {
      // Fail safe:
      // Don't crash the app if the wrong view is passed from ObjC/JS, but also don't leave the
      // app stuck behind the splash screen indefinitely.
      RNSplashScreen.setAnimationFinished(true)
      return
    }

    lottieView.play { _ in
        RNSplashScreen.setAnimationFinished(true)
      }
  }
}