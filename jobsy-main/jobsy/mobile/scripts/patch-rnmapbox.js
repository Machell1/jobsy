#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const mapboxRoot = path.join(__dirname, '..', 'node_modules', '@rnmapbox', 'maps');

// Fix 1: Remove nested package.json that breaks Expo plugin resolution
const nestedPkg = path.join(mapboxRoot, 'lib', 'module', 'package.json');
if (fs.existsSync(nestedPkg)) {
  fs.unlinkSync(nestedPkg);
  console.log('[patch-rnmapbox] Removed lib/module/package.json');
}

// Fix 2: Stub main entry as CJS for Expo config plugin resolution
const indexJs = path.join(mapboxRoot, 'lib', 'module', 'index.js');
if (fs.existsSync(indexJs)) {
  fs.writeFileSync(indexJs,
    '"use strict";\nmodule.exports = {};\nObject.defineProperty(module.exports, "__esModule", { value: true });\n'
  );
  console.log('[patch-rnmapbox] Stubbed lib/module/index.js as CJS');
}

// Fix 3: Patch NativeRNMBXLocationModuleSpec.java to add missing mEventEmitterCallback
// See: https://github.com/rnmapbox/maps/issues/3795
const specFile = path.join(mapboxRoot,
  'android', 'src', 'main', 'old-arch', 'com', 'rnmapbox', 'rnmbx',
  'NativeRNMBXLocationModuleSpec.java');

if (fs.existsSync(specFile)) {
  let content = fs.readFileSync(specFile, 'utf8');
  if (!content.includes('Callback mEventEmitterCallback')) {
    // Add Callback import
    if (!content.includes('import com.facebook.react.bridge.Callback;')) {
      content = content.replace(
        'import com.facebook.proguard.annotations.DoNotStrip;',
        'import com.facebook.proguard.annotations.DoNotStrip;\nimport com.facebook.react.bridge.Callback;'
      );
    }
    // Add mEventEmitterCallback field (protected so subclasses can access it)
    content = content.replace(
      'public static final String NAME = "RNMBXLocationModule";',
      'public static final String NAME = "RNMBXLocationModule";\n\n  protected Callback mEventEmitterCallback;'
    );
    // Fix emitOnLocationUpdate to null-check
    content = content.replace(
      /protected final void emitOnLocationUpdate\(ReadableMap value\)\s*\{[^}]*\}/,
      'protected final void emitOnLocationUpdate(ReadableMap value) {\n    if (mEventEmitterCallback != null) {\n      mEventEmitterCallback.invoke("onLocationUpdate", value);\n    }\n  }'
    );
    fs.writeFileSync(specFile, content);
    console.log('[patch-rnmapbox] Patched NativeRNMBXLocationModuleSpec.java');
  } else {
    console.log('[patch-rnmapbox] NativeRNMBXLocationModuleSpec.java already patched');
  }
} else {
  console.log('[patch-rnmapbox] NativeRNMBXLocationModuleSpec.java not found (may not be needed)');
}

// Fix 4: Patch NativeRNMBXLocationModule.ts to remove EventEmitter import
const tsSpecFile = path.join(mapboxRoot, 'src', 'specs', 'NativeRNMBXLocationModule.ts');
if (fs.existsSync(tsSpecFile)) {
  let content = fs.readFileSync(tsSpecFile, 'utf8');
  if (content.includes("import type { EventEmitter }")) {
    content = content.replace(
      /import type \{ EventEmitter \} from ['"]react-native\/Libraries\/Types\/CodegenTypes['"];?\n?/,
      ''
    );
    content = content.replace(
      /readonly onLocationUpdate: EventEmitter<LocationEvent>/,
      'onLocationUpdate(callback: (event: LocationEvent) => void): void'
    );
    fs.writeFileSync(tsSpecFile, content);
    console.log('[patch-rnmapbox] Patched NativeRNMBXLocationModule.ts');
  }
}

// Fix 5: Patch RNMBXLocationModule.kt to implement missing onLocationUpdate abstract method
// and fix the emitOnLocationUpdate reference
const ktFile = path.join(mapboxRoot,
  'android', 'src', 'main', 'java', 'com', 'rnmapbox', 'rnmbx',
  'modules', 'RNMBXLocationModule.kt');

if (fs.existsSync(ktFile)) {
  let content = fs.readFileSync(ktFile, 'utf8');
  let patched = false;

  // Add missing onLocationUpdate implementation if not present
  if (!content.includes('override fun onLocationUpdate(callback: Callback?)')) {
    // Find the class body opening and add the missing method
    content = content.replace(
      /class RNMBXLocationModule\([^)]*\)\s*:\s*NativeRNMBXLocationModuleSpec\([^)]*\)\s*\{/,
      (match) => `${match}\n\n  override fun onLocationUpdate(callback: Callback?) {\n    mEventEmitterCallback = callback\n  }\n`
    );
    patched = true;
  }

  // Fix emitOnLocationUpdate references — replace with direct callback invocation
  if (content.includes('emitOnLocationUpdate') && !content.includes('fun emitOnLocationUpdate')) {
    content = content.replace(
      /emitOnLocationUpdate\(([^)]+)\)/g,
      'mEventEmitterCallback?.invoke("onLocationUpdate", $1)'
    );
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(ktFile, content);
    console.log('[patch-rnmapbox] Patched RNMBXLocationModule.kt');
  } else {
    console.log('[patch-rnmapbox] RNMBXLocationModule.kt already patched or not needed');
  }
} else {
  console.log('[patch-rnmapbox] RNMBXLocationModule.kt not found (checking alternative paths)');
  // Try alternative path structure
  const altPaths = [
    path.join(mapboxRoot, 'android', 'src', 'main', 'java', 'com', 'mapbox', 'rctmgl', 'modules', 'RNMBXLocationModule.kt'),
    path.join(mapboxRoot, 'android', 'src', 'main', 'kotlin', 'com', 'rnmapbox', 'rnmbx', 'modules', 'RNMBXLocationModule.kt'),
  ];
  for (const alt of altPaths) {
    if (fs.existsSync(alt)) {
      console.log('[patch-rnmapbox] Found at:', alt);
      break;
    }
  }
}

console.log('[patch-rnmapbox] Patch applied successfully');
