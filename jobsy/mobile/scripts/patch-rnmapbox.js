#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const mapboxRoot = path.join(__dirname, '..', 'node_modules', '@rnmapbox', 'maps');
const nestedPkg = path.join(mapboxRoot, 'lib', 'module', 'package.json');
const indexJs = path.join(mapboxRoot, 'lib', 'module', 'index.js');

if (fs.existsSync(nestedPkg)) {
  fs.unlinkSync(nestedPkg);
  console.log('[patch-rnmapbox] Removed lib/module/package.json');
}

if (fs.existsSync(indexJs)) {
  fs.writeFileSync(indexJs, '"use strict";\nmodule.exports = {};\nObject.defineProperty(module.exports, "__esModule", { value: true });\n');
  console.log('[patch-rnmapbox] Stubbed lib/module/index.js as CJS');
}

console.log('[patch-rnmapbox] Patch applied successfully');
