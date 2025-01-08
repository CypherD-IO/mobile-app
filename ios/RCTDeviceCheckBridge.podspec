Pod::Spec.new do |s|
  s.name         = "RCTDeviceCheckBridge"
  s.version      = "1.0.0"
  s.summary      = "DeviceCheck bridge for React Native"
  s.description  = <<-DESC
                  DeviceCheck bridge for React Native
                  DESC
  s.homepage     = "https://github.com/yourusername/yourproject"
  s.license      = "MIT"
  s.author       = { "Your Name" => "your@email.com" }
  s.platform     = :ios, "14.0"
  s.source       = { :git => "https://github.com/yourusername/yourproject.git", :tag => "#{s.version}" }
  
  # Update source files path to be explicit
  s.source_files = "ios/RCTDeviceCheckBridge.{h,m}"
  s.requires_arc = true

  s.dependency "React-Core"
  
  # Add header search paths
  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => [
      '$(PODS_ROOT)/Headers/Public/React-Core',
      '$(PODS_ROOT)/Headers/Public/React'
    ]
  }
end 