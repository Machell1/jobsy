const { withPodfile } = require('@expo/config-plugins');

/**
 * Config plugin that ensures a minimum iOS deployment target of 16.0
 * in the Podfile. This fixes MapboxMaps (requires 14.0+) and other
 * pods that need a higher deployment target.
 */
module.exports = function withMinDeploymentTarget(config) {
  return withPodfile(config, (config) => {
    let podfile = config.modResults.contents;

    // Replace platform :ios line with 16.0
    podfile = podfile.replace(
      /platform :ios, '[\d.]+'/,
      "platform :ios, '16.0'"
    );

    // Add post_install hook to force all pods to use 16.0 if not already present
    if (!podfile.includes('FORCE_DEPLOYMENT_TARGET')) {
      const postInstallHook = `
  # FORCE_DEPLOYMENT_TARGET: Ensure all pods use iOS 16.0+
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 16.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
      end
    end
  end`;

      // Insert into existing post_install block
      podfile = podfile.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|${postInstallHook}`
      );
    }

    config.modResults.contents = podfile;
    return config;
  });
};
