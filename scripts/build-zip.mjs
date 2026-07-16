#!/usr/bin/env node

/**
 * {{PLUGIN_NAME}} - 插件打包脚本
 * 
 * 功能：自动构建前端和 sidecar，生成可发布的 ZIP 文件
 * 
 * 使用方法：
 *   node scripts/build-zip.mjs
 * 
 * 输出：
 *   - {{PLUGIN_ID}}.zip （包含 manifest.json + dist/ + sidecar 二进制）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从插件根目录运行此脚本
const pluginRoot = path.resolve(__dirname, '..');
const stagingDir = path.join(pluginRoot, '.build-staging');

console.log('📦 {{PLUGIN_NAME}} 插件打包工具\n');

// Step 1: 读取 manifest.json
console.log('📋 读取 manifest.json...');
const manifestPath = path.join(pluginRoot, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ 错误: 找不到 manifest.json');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const pluginId = manifest.id;
const pluginName = manifest.name;
const sidecarExecutable = manifest.sidecar?.executable || `${pluginId}-sidecar`;

if (pluginId.includes('{{') || pluginName.includes('{{')) {
  console.error('❌ 错误: 请先替换 manifest.json 中的模板变量（{{PLUGIN_ID}}、{{PLUGIN_NAME}}）');
  process.exit(1);
}

// Step 1.5: 版本号同步 — package.json 为唯一来源（Source of Truth）
// 自动将 package.json 的 version 同步到 manifest.json，防止版本不一致
const pkgPath = path.join(pluginRoot, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const pkgVersion = pkg.version;
  const manifestVersion = manifest.version;

  if (pkgVersion && manifestVersion !== pkgVersion) {
    console.warn(`   ⚠️ 版本不一致: package.json=${pkgVersion}, manifest.json=${manifestVersion}`);
    console.warn(`   → 自动同步: manifest.json version → ${pkgVersion}`);
    manifest.version = pkgVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  } else {
    console.log(`   ✅ 版本一致: v${pkgVersion}`);
  }
} else {
  console.warn('   ⚠️ 未找到 package.json，跳过版本同步');
}

console.log(`   插件 ID: ${pluginId}`);
console.log(`   插件名称: ${pluginName}`);
console.log(`   Sidecar 可执行文件: ${sidecarExecutable}\n`);

// Step 2: 清理旧的构建产物
console.log('🧹 清理旧构建产物...');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
const oldZipPath = path.join(pluginRoot, `${pluginId}.zip`);
if (fs.existsSync(oldZipPath)) {
  fs.unlinkSync(oldZipPath);
}
console.log('   ✓ 清理完成\n');

// Step 3: 构建前端
console.log('🔨 构建前端...');
const frontendDir = path.join(pluginRoot, 'frontend');
if (!fs.existsSync(frontendDir)) {
  console.error('❌ 错误: 找不到 frontend 目录');
  process.exit(1);
}

try {
  execSync('pnpm vite build', {
    cwd: path.join(pluginRoot, 'frontend'),
    stdio: 'inherit',
    shell: true
  });
} catch (error) {
  console.error('❌ 前端构建失败');
  process.exit(1);
}

// 检查构建产物
const distDir = path.join(pluginRoot, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ 错误: 前端构建后未生成 dist 目录');
  process.exit(1);
}
console.log('   ✓ 前端构建完成\n');

// Step 4: 构建 sidecar
console.log('🦀 构建 Sidecar (Rust)...');
const srcDir = path.join(pluginRoot, 'src');
if (!fs.existsSync(srcDir)) {
  console.error('❌ 错误: 找不到 src 目录');
  process.exit(1);
}

const cargoTomlPath = path.join(srcDir, 'Cargo.toml');
if (!fs.existsSync(cargoTomlPath)) {
  console.error('❌ 错误: 找不到 src/Cargo.toml');
  process.exit(1);
}

try {
  execSync(`cargo build --release --manifest-path "${cargoTomlPath}"`, {
    cwd: pluginRoot,
    stdio: 'inherit',
    shell: true
  });
} catch (error) {
  console.error('❌ Sidecar 构建失败');
  process.exit(1);
}

// 检查 sidecar 二进制
const targetDir = path.join(srcDir, 'target', 'release');
let sidecarBinary;
const platform = process.platform;

if (platform === 'win32') {
  sidecarBinary = path.join(targetDir, `${sidecarExecutable}.exe`);
} else {
  sidecarBinary = path.join(targetDir, sidecarExecutable);
}

if (!fs.existsSync(sidecarBinary)) {
  console.error(`❌ 错误: Sidecar 二进制文件未找到: ${sidecarBinary}`);
  process.exit(1);
}
console.log('   ✓ Sidecar 构建完成\n');

// Step 5: 创建临时目录并复制文件
console.log('📂 准备打包文件...');
fs.mkdirSync(stagingDir, { recursive: true });

// 写入生产环境 manifest.json（剥离开发配置）
const strippedFields = writeProductionManifest(manifest, path.join(stagingDir, 'manifest.json'));
if (strippedFields.length > 0) {
  console.log(`   ✓ 写入生产 manifest.json（已剥离开发配置: ${strippedFields.join(', ')}）`);
} else {
  console.log('   ✓ 写入 manifest.json（无开发配置需剥离）');
}

// 复制 dist/
const distStagingDir = path.join(stagingDir, 'dist');
fs.mkdirSync(distStagingDir, { recursive: true });
copyDirectory(distDir, distStagingDir);
console.log('   ✓ 复制 dist/');

// 复制 sidecar 二进制
fs.copyFileSync(sidecarBinary, path.join(stagingDir, path.basename(sidecarBinary)));
console.log(`   ✓ 复制 ${path.basename(sidecarBinary)}`);

// 复制 RELEASE.md → ZIP 内的 README.md（用户可见的功能说明文档）
const releaseMdPath = path.join(pluginRoot, 'RELEASE.md');
if (fs.existsSync(releaseMdPath)) {
  fs.copyFileSync(releaseMdPath, path.join(stagingDir, 'README.md'));
  console.log('   ✓ 复制 RELEASE.md → README.md\n');
} else {
  console.warn('   ⚠️ 未找到 RELEASE.md，跳过用户说明文档（建议创建）\n');
}

// 复制 CHANGELOG.md（版本历史，供前端 usePluginChangelog 读取）
const changelogPath = path.join(pluginRoot, 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  fs.copyFileSync(changelogPath, path.join(stagingDir, 'CHANGELOG.md'));
  console.log('   ✓ 复制 CHANGELOG.md\n');
} else {
  console.warn('   ⚠️ 未找到 CHANGELOG.md，跳过版本历史文件\n');
}

// Step 6: 创建 ZIP 文件
console.log('🗜️  创建 ZIP 文件...');
const zipPath = path.join(pluginRoot, `${pluginId}.zip`);

try {
  if (platform === 'win32') {
    // Windows: 使用 PowerShell Compress-Archive
    execSync(
      `Compress-Archive -Path "${stagingDir}\\*" -DestinationPath "${zipPath}" -Force`,
      { stdio: 'inherit', shell: 'powershell.exe' }
    );
  } else {
    // macOS/Linux: 使用 zip 命令
    execSync(`cd "${stagingDir}" && zip -r "${zipPath}" .`, {
      stdio: 'inherit',
      shell: true
    });
  }
} catch (error) {
  console.error('❌ 创建 ZIP 文件失败');
  process.exit(1);
}

// Step 7: 校验 ZIP 内的 manifest.json 版本号
// 打开刚生成的 ZIP，读取其中的 manifest.json，验证 version 与 package.json 一致
const zipVersion = verifyZipManifestVersion(zipPath, manifest.version);
if (!zipVersion) {
  console.error(`❌ ZIP 内 manifest.json 版本校验失败！`);
  console.error(`   期望版本: ${manifest.version}`);
  console.error(`   ZIP 文件: ${zipPath}`);
  process.exit(1);
}
console.log(`   ✅ ZIP 内 manifest.json 版本校验通过: v${zipVersion}\n`);

// Step 8: 获取文件大小
const stats = fs.statSync(zipPath);
const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`   ✓ ZIP 文件已创建: ${pluginId}.zip (${fileSizeMB} MB)\n`);

// Step 8: 清理临时目录
console.log('🧹 清理临时文件...');
fs.rmSync(stagingDir, { recursive: true, force: true });
console.log('   ✓ 清理完成\n');

console.log('✅ 打包完成！');
console.log(`\n📦 产物: ${zipPath}`);
console.log(`📊 大小: ${fileSizeMB} MB`);
console.log('\n📋 ZIP 内容:');
console.log('   - manifest.json');
console.log('   - dist/ (前端构建产物)');
console.log(`   - ${path.basename(sidecarBinary)} (Sidecar 二进制)`);
if (fs.existsSync(path.join(pluginRoot, 'RELEASE.md'))) {
  console.log('   - README.md (用户功能说明，来自 RELEASE.md)');
}
if (fs.existsSync(path.join(pluginRoot, 'CHANGELOG.md'))) {
  console.log('   - CHANGELOG.md (版本历史)');
}
console.log('\n💡 提示: ZIP 文件不包含源码，可以直接发布到插件市场\n');

/**
 * 生成生产环境 manifest.json（剥离开发配置）
 *
 * 生产 ZIP 包不应包含开发模式字段，避免：
 * 1. dev_mode.enabled = true 导致插件被误标为开发模式
 * 2. frontend.dev_port 泄露开发端口或意外触发 dev server 连接
 *
 * 仅写入 staging 副本，不修改源 manifest.json（保留本地开发配置）。
 *
 * @param {object} manifest - 原始 manifest 对象
 * @param {string} destPath - staging 目标路径
 * @returns {string[]} 被剥离的字段列表
 */
function writeProductionManifest(manifest, destPath) {
  const prodManifest = JSON.parse(JSON.stringify(manifest));
  const stripped = [];

  // 剥离 dev_mode（热更新预留配置）
  if ('dev_mode' in prodManifest) {
    delete prodManifest.dev_mode;
    stripped.push('dev_mode');
  }

  // 剥离 frontend.dev_port（开发服务器端口）
  if (prodManifest.frontend && 'dev_port' in prodManifest.frontend) {
    delete prodManifest.frontend.dev_port;
    stripped.push('frontend.dev_port');
  }

  fs.writeFileSync(destPath, JSON.stringify(prodManifest, null, 2) + '\n');
  return stripped;
}

/**
 * 递归复制目录
 */
function copyDirectory(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 校验 ZIP 内的 manifest.json 版本号
 *
 * 解压 ZIP 中的 manifest.json 并验证 version 字段是否与期望版本一致。
 * 防止打包错误的版本号被发布。
 *
 * @param {string} zipPath - ZIP 文件路径
 * @param {string} expectedVersion - 期望的版本号（来自 package.json）
 * @returns {string|null} 匹配时返回版本号，不匹配或读取失败时返回 null
 */
function verifyZipManifestVersion(zipPath, expectedVersion) {
  try {
    const tempManifest = path.join(pluginRoot, '.build-staging', 'manifest_verify.json');
    fs.mkdirSync(path.dirname(tempManifest), { recursive: true });

    if (process.platform === 'win32') {
      const tempExtractDir = path.join(pluginRoot, '.build-staging', 'verify');
      fs.mkdirSync(tempExtractDir, { recursive: true });
      execSync(
        `Expand-Archive -Path "${zipPath}" -DestinationPath "${tempExtractDir}" -Force`,
        { stdio: 'pipe', shell: 'powershell.exe' }
      );
      const extractedManifest = path.join(tempExtractDir, 'manifest.json');
      if (!fs.existsSync(extractedManifest)) {
        console.error('   ❌ ZIP 中未找到 manifest.json');
        return null;
      }
      fs.copyFileSync(extractedManifest, tempManifest);
    } else {
      execSync(`unzip -o "${zipPath}" manifest.json -d "${path.dirname(tempManifest)}"`, {
        stdio: 'pipe', shell: true,
      });
    }

    const zipManifest = JSON.parse(fs.readFileSync(tempManifest, 'utf-8'));
    const zipVersion = zipManifest.version;

    if (zipVersion !== expectedVersion) {
      console.error(`   ❌ ZIP 内版本 (${zipVersion}) 与期望版本 (${expectedVersion}) 不一致！`);
      return null;
    }

    return zipVersion;
  } catch (err) {
    console.error(`   ❌ ZIP 版本校验异常: ${err.message}`);
    return null;
  }
}
