const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin that patches expo-modules-core's PermissionsService.kt
 * for compileSdkVersion 35 compatibility.
 *
 * With compileSdk 35, PackageInfo.requestedPermissions changed from
 * Array<String> to Array<String>? (nullable). The original code calls
 * .contains() directly on this nullable array, causing a compilation error.
 * This plugin adds null-safety operators to fix the issue.
 */
module.exports = function withCompileSdk35Fix(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const filePath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo-modules-core',
        'android',
        'src',
        'main',
        'java',
        'expo',
        'modules',
        'adapters',
        'react',
        'permissions',
        'PermissionsService.kt'
      );

      if (!fs.existsSync(filePath)) {
        console.warn(
          '[withCompileSdk35Fix] PermissionsService.kt not found, skipping patch'
        );
        return config;
      }

      let contents = fs.readFileSync(filePath, 'utf-8');

      // Fix: requestedPermissions is nullable (Array<String>?) in compileSdk 35.
      // Change `.contains(permission)` to `?.contains(permission) ?: false`
      const oldCode = 'return requestedPermissions.contains(permission)';
      const newCode =
        'return requestedPermissions?.contains(permission) ?: false';

      if (contents.includes(oldCode)) {
        contents = contents.replace(oldCode, newCode);
        fs.writeFileSync(filePath, contents, 'utf-8');
        console.log(
          '[withCompileSdk35Fix] Patched PermissionsService.kt for compileSdk 35 null safety'
        );
      } else {
        console.log(
          '[withCompileSdk35Fix] PermissionsService.kt already patched or code not found'
        );
      }

      return config;
    },
  ]);
};
