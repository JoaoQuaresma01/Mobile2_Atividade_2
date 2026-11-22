try {
  require('./patch-metro');
} catch (e) {
  console.warn('Could not run patch-metro:', e.message);
}

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const projectRoot = path.resolve(__dirname);
config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];
config.resolver.unstable_enablePackageExports = true;

// Expo SQLite on Web requires wasm to be an asset
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'wasm');

const standardResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === context.emptyModulePath || moduleName.endsWith('empty-module.js')) {
    return {
      type: 'sourceFile',
      filePath: context.emptyModulePath,
    };
  }

  try {
    return (standardResolveRequest || context.resolveRequest)(context, moduleName, platform);
  } catch (err) {
    let candidatePath = null;
    if (path.isAbsolute(moduleName)) {
      candidatePath = moduleName;
    } else if (moduleName.startsWith('.')) {
      candidatePath = path.resolve(path.dirname(context.originModulePath), moduleName);
    }

    if (candidatePath) {
      for (const ext of ['', '.android.js', '.native.js', '.js', '.android.tsx', '.native.tsx', '.tsx', '.android.ts', '.native.ts', '.ts', '.json']) {
        const full = candidatePath + ext;
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          return {
            type: 'sourceFile',
            filePath: full,
          };
        }
      }
    }
    throw err;
  }
};

module.exports = config;
