const fs = require('fs');
const path = require('path');

function patchTreeFS(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('__diskFallback_lookup')) {
    // 1. Patch getOrComputeSha1
    content = content.replace(
      /async getOrComputeSha1\(mixedPath\)\s*\{([\s\S]*?)if \(!result\.exists \|\| isDirectory\(result\.node\)\)\s*\{([\s\S]*?)return null;\s*\}/,
      (match) => {
        return match.replace(
          'return null;',
          `// __diskFallback_sha1
        try {
          const absPath = require('node:path').isAbsolute(mixedPath) ? mixedPath : this.#pathUtils.normalToAbsolute(normalPath);
          const fsMod = require('node:fs');
          if (fsMod.existsSync(absPath) && fsMod.statSync(absPath).isFile()) {
            const crypto = require('node:crypto');
            const content = fsMod.readFileSync(absPath);
            const sha1 = crypto.createHash('sha1').update(content).digest('hex');
            return { content, sha1 };
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
        // __diskFallback_lookup
        try {
          const absPath = require('node:path').isAbsolute(mixedPath) ? mixedPath : this.#pathUtils.normalToAbsolute(normalPath);
          const fsMod = require('node:fs');
          if (fsMod.existsSync(absPath)) {
            const stat = fsMod.statSync(absPath);
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
          const absPath = require('node:path').isAbsolute(mixedPath) ? mixedPath : this.#pathUtils.normalToAbsolute(this.#normalizePath(mixedPath));
          const fsMod = require('node:fs');
          return fsMod.existsSync(absPath) && fsMod.statSync(absPath).isFile();
        } catch {
          return false;
        }`;
      }
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[patch-metro] Successfully patched TreeFS in ${filePath}`);
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

const p1 = path.resolve(__dirname, 'node_modules/@expo/metro-file-map/build/lib/TreeFS.js');
const p2 = path.resolve(__dirname, 'node_modules/metro-file-map/src/lib/TreeFS.js');
patchTreeFS(p1);
patchTreeFS(p2);

const i1 = path.resolve(__dirname, 'node_modules/@expo/metro-file-map/build/index.js');
const i2 = path.resolve(__dirname, 'node_modules/metro-file-map/src/index.js');
patchIndex(i1);
patchIndex(i2);
