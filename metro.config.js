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

// Endpoint para receber e sincronizar o arquivo SQLite gerado no dispositivo/web para a raiz do projeto
const standardEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = config.server || {};
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const customMiddleware = (req, res, next) => {
    if (req.url === '/api/save-db' && req.method === 'POST') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const dbPath = path.resolve(__dirname, 'LivrariaApp.db');
          fs.writeFileSync(dbPath, buffer);
          console.log(`[SQLite Sync] Banco de dados salvo com sucesso em: ${dbPath} (${buffer.length} bytes)`);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, path: dbPath, size: buffer.length }));
        } catch (err) {
          console.error('[SQLite Sync] Erro ao salvar banco:', err);
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    if (req.url === '/api/save-db' && req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.writeHead(204);
      res.end();
      return;
    }
    return metroMiddleware(req, res, next);
  };

  return standardEnhanceMiddleware
    ? standardEnhanceMiddleware(customMiddleware, server)
    : customMiddleware;
};

const standardResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === context.emptyModulePath ||
    moduleName.endsWith('empty-module.js') ||
    moduleName.endsWith('empty-module')
  ) {
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
    } else {
      const nmPath = path.resolve(projectRoot, 'node_modules', moduleName);
      if (fs.existsSync(nmPath)) {
        candidatePath = nmPath;
      }
    }

    if (candidatePath) {
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
        const pkgJson = path.join(candidatePath, 'package.json');
        if (fs.existsSync(pkgJson)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
            const main = pkg.main || 'index.js';
            candidatePath = path.resolve(candidatePath, main);
          } catch {}
        } else {
          candidatePath = path.join(candidatePath, 'index');
        }
      }
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
