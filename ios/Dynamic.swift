import Foundation
import UIKit
import Lottie

@objc class Dynamic: NSObject {

  /// Minimum amount of time (in seconds) the native Lottie splash should remain visible.
  private let minimumSplashSeconds: TimeInterval = 2.0

  /// Creates and returns a Lottie animation view.
  /// Uses UIScreen.main.bounds for frame to ensure full coverage regardless of view state.
  @objc func createAnimationView(rootView: UIView, lottieName: String) -> UIView {
    let animationView = LottieAnimationView(name: lottieName)
    
    // ALWAYS use screen bounds for the splash frame.
    // This ensures full coverage even if the passed view has zero frame (common in Release builds).
    animationView.frame = UIScreen.main.bounds
    animationView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    animationView.contentMode = .scaleAspectFill
    
    animationView.loopMode = .playOnce
    animationView.backgroundColor = UIColor.black
    
    let loaded = animationView.animation != nil
    NSLog("[Splash] createAnimationView: name=%@, loaded=%@, frame=%@",
          lottieName,
          loaded ? "YES" : "NO",
          NSCoder.string(for: animationView.frame))
    
    return animationView
  }

  /// Plays the Lottie animation and notifies RNSplashScreen after a strict minimum duration.
  @objc func play(animationView: UIView) {
    NSLog("[Splash] play() called. Enforcing strict %.1f second minimum before allowing hide.", minimumSplashSeconds)

    // Play the Lottie animation visually (if it loaded)
    if let lottieView = animationView as? LottieAnimationView {
      if lottieView.animation != nil {
        lottieView.play { completed in
          NSLog("[Splash] Lottie animation playback completed=%@", completed ? "YES" : "NO")
        }
      } else {
        NSLog("[Splash] WARNING: Lottie animation did not load. Showing static black screen.")
      }
    }

    // STRICT TIMER: Only signal animation finished after the minimum duration.
    // This is the ONLY place that calls setAnimationFinished(true).
    // The splash will NOT be removed until BOTH:
    //   1. This timer fires (native side)
    //   2. JS calls SplashScreen.hide()
    DispatchQueue.main.asyncAfter(deadline: .now() + minimumSplashSeconds) {
      NSLog("[Splash] Timer fired after %.1f seconds. Calling RNSplashScreen.setAnimationFinished(true)", self.minimumSplashSeconds)
      RNSplashScreen.setAnimationFinished(true)
    }
  }
}
