const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin that patches expo-av's EXAV.h to use the correct
 * ExpoModulesCore import path for SDK 55+.
 *
 * In SDK 55, EXEventEmitter.h was removed/renamed in ExpoModulesCore.
 * This plugin replaces the old import with a forward declaration
 * and protocol import that works with the new module structure.
 */
module.exports = function withExpoAvFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const exavHeaderPath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo-av',
        'ios',
        'EXAV',
        'EXAV.h'
      );

      if (!fs.existsSync(exavHeaderPath)) {
        console.warn('[withExpoAvFix] EXAV.h not found, skipping patch');
        return config;
      }

      let contents = fs.readFileSync(exavHeaderPath, 'utf-8');

      // Replace the problematic import with one that works in SDK 55
      if (contents.includes('#import <ExpoModulesCore/EXEventEmitter.h>')) {
        contents = contents.replace(
          '#import <ExpoModulesCore/EXEventEmitter.h>',
          '#if __has_include(<ExpoModulesCore/EXEventEmitter.h>)\n#import <ExpoModulesCore/EXEventEmitter.h>\n#else\n@protocol EXEventEmitter <NSObject>\n- (NSArray<NSString *> *)supportedEvents;\n- (void)startObserving;\n- (void)stopObserving;\n@end\n#endif'
        );
        fs.writeFileSync(exavHeaderPath, contents, 'utf-8');
        console.log('[withExpoAvFix] Patched EXAV.h for SDK 55 compatibility');
      }

      // Also fix EXAV.m
      const exavImplPath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo-av',
        'ios',
        'EXAV',
        'EXAV.m'
      );

      if (fs.existsSync(exavImplPath)) {
        let implContents = fs.readFileSync(exavImplPath, 'utf-8');
        if (implContents.includes('#import <ExpoModulesCore/EXEventEmitterService.h>')) {
          implContents = implContents.replace(
            '#import <ExpoModulesCore/EXEventEmitterService.h>',
            '#if __has_include(<ExpoModulesCore/EXEventEmitterService.h>)\n#import <ExpoModulesCore/EXEventEmitterService.h>\n#else\n@protocol EXEventEmitterService <NSObject>\n- (void)sendEventWithName:(NSString *)name body:(id)body;\n@end\n#endif'
          );
          fs.writeFileSync(exavImplPath, implContents, 'utf-8');
          console.log('[withExpoAvFix] Patched EXAV.m for SDK 55 compatibility');
        }
      }

      // Fix EXAVTV.m too
      const exavTvPath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo-av',
        'ios',
        'EXAV',
        'EXAVTV.m'
      );

      if (fs.existsSync(exavTvPath)) {
        let tvContents = fs.readFileSync(exavTvPath, 'utf-8');
        if (tvContents.includes('#import <ExpoModulesCore/EXEventEmitterService.h>')) {
          tvContents = tvContents.replace(
            '#import <ExpoModulesCore/EXEventEmitterService.h>',
            '#if __has_include(<ExpoModulesCore/EXEventEmitterService.h>)\n#import <ExpoModulesCore/EXEventEmitterService.h>\n#else\n@protocol EXEventEmitterService <NSObject>\n- (void)sendEventWithName:(NSString *)name body:(id)body;\n@end\n#endif'
          );
          fs.writeFileSync(exavTvPath, tvContents, 'utf-8');
          console.log('[withExpoAvFix] Patched EXAVTV.m for SDK 55 compatibility');
        }
      }

      return config;
    },
  ]);
};
