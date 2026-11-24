const fs = require('fs');
const path = require('path');

function patchTreeFS(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove older patch if present to re-apply updated fallback
  if (content.includes('// __diskFallback_sha1') && !content.includes('__diskFallback_v2')) {
    content = content.replace(/\/\/ __diskFallback_sha1[\s\S]*?return null;/g, 'return null;');
    content = content.replace(/\/\/ __diskFallback_lookup[\s\S]*?catch \{\}/g, '');
  }

  if (!content.includes('__diskFallback_v2')) {
    // 1. Patch getOrComputeSha1
    content = content.replace(
      /async getOrComputeSha1\(mixedPath\)\s*\{([\s\S]*?)if \(!result\.exists \|\| isDirectory\(result\.node\)\)\s*\{([\s\S]*?)return null;\s*\}/,
      (match) => {
        return match.replace(
          'return null;',
          `// __diskFallback_sha1 __diskFallback_v2
        try {
          const _p = require('node:path');
          const _fs = require('node:fs');
          let absPath = _p.isAbsolute(mixedPath) ? mixedPath : _p.resolve(this.#rootDir, mixedPath);
          if (!_fs.existsSync(absPath)) {
            try { absPath = this.#pathUtils.normalToAbsolute(normalPath); } catch {}
          }
          if (_fs.existsSync(absPath) && _fs.statSync(absPath).isFile()) {
            const crypto = require('node:crypto');
            const fileContent = _fs.readFileSync(absPath);
            const sha1 = crypto.createHash('sha1').update(fileContent).digest('hex');
            return { content: fileContent, sha1 };
          }
        } catch {}
        return null;`
        );
      }
    );

    // 2. Patch lookup
    content = content.replace(
      /lookup\(mixedPath\)\s*\{([\s\S]*?)if \(!result\.exists\)\s*\{/,
      (match) => {
        return `${match}
        // __diskFallback_lookup __diskFallback_v2
        try {
          const _p = require('node:path');
          const _fs = require('node:fs');
          let absPath = _p.isAbsolute(mixedPath) ? mixedPath : _p.resolve(this.#rootDir, mixedPath);
          if (!_fs.existsSync(absPath)) {
            try { absPath = this.#pathUtils.normalToAbsolute(normalPath); } catch {}
          }
          if (_fs.existsSync(absPath)) {
            const stat = _fs.statSync(absPath);
            if (stat.isFile()) {
              return { exists: true, links, realPath: absPath, type: 'f', metadata: [stat.mtimeMs, stat.size, 0, null, 0, null] };
            } else if (stat.isDirectory()) {
              return { exists: true, links, realPath: absPath, type: 'd' };
            }
          }
        } catch {}`;
      }
    );

    // 3. Patch exists
    content = content.replace(
      /exists\(mixedPath\)\s*\{([\s\S]*?)return result\.exists && !isDirectory\(result\.node\);/,
      (match) => {
        return `exists(mixedPath) {
        const result = this.#lookup(this.#normalizePath(mixedPath));
        if (result.exists && !isDirectory(result.node)) return true;
        try {
          const _p = require('node:path');
          const _fs = require('node:fs');
          let absPath = _p.isAbsolute(mixedPath) ? mixedPath : _p.resolve(this.#rootDir, mixedPath);
          if (_fs.existsSync(absPath)) return true;
          return _fs.existsSync(this.#pathUtils.normalToAbsolute(this.#normalizePath(mixedPath)));
        } catch {
          return false;
        }`;
      }
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[patch-metro] Successfully patched TreeFS in ${filePath}`);
  }
}

function patchRootPathUtils(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('__rootPathUtils_win32')) {
    content = content.replace(
      'absolutePath.startsWith(nextPart, endOfMatchingPrefix)',
      '(IS_WIN32 ? absolutePath.slice(endOfMatchingPrefix, endOfMatchingPrefix + nextLength).toLowerCase() === nextPart.toLowerCase() : absolutePath.startsWith(nextPart, endOfMatchingPrefix)) /* __rootPathUtils_win32 */'
    );
    content = content.replace(
      'fullPath.startsWith(segmentToMaybeCollapse, pos)',
      '(IS_WIN32 ? fullPath.slice(pos, pos + segmentToMaybeCollapse.length).toLowerCase() === segmentToMaybeCollapse.toLowerCase() : fullPath.startsWith(segmentToMaybeCollapse, pos)) /* __rootPathUtils_win32 */'
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[patch-metro] Successfully patched RootPathUtils in ${filePath}`);
  }
}

function patchIndex(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('__readlink_einval')) {
    content = content.replace(
      /\[\s*['"]ENOENT['"]\s*,\s*['"]EACCESS['"]\s*\]\.includes\(([^)]+)\)/g,
      "['ENOENT', 'EACCESS', 'EINVAL', 'UNKNOWN'].includes($1) /* __readlink_einval */"
    );
    content = content.replace(
      /\[\s*['"]ENOENT['"]\s*,\s*['"]EACCESS['"]\s*\]/g,
      "['ENOENT', 'EACCESS', 'EINVAL', 'UNKNOWN'] /* __readlink_einval */"
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[patch-metro] Successfully patched readlink errors in ${filePath}`);
  }
}

// 1. Patch TreeFS
const p1 = path.resolve(__dirname, 'node_modules/@expo/metro-file-map/build/lib/TreeFS.js');
const p2 = path.resolve(__dirname, 'node_modules/metro-file-map/src/lib/TreeFS.js');
patchTreeFS(p1);
patchTreeFS(p2);

// 2. Patch RootPathUtils
const r1 = path.resolve(__dirname, 'node_modules/@expo/metro-file-map/build/lib/RootPathUtils.js');
const r2 = path.resolve(__dirname, 'node_modules/metro-file-map/src/lib/RootPathUtils.js');
patchRootPathUtils(r1);
patchRootPathUtils(r2);

// 3. Patch index for readlink
const i1 = path.resolve(__dirname, 'node_modules/@expo/metro-file-map/build/index.js');
const i2 = path.resolve(__dirname, 'node_modules/metro-file-map/src/index.js');
patchIndex(i1);
patchIndex(i2);
