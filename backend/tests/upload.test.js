const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

describe('Upload Suite: Security, Archive Validation & Resource Protection', () => {

  // Helper: Create valid zip buffer
  const createValidZipBuffer = (files = { 'index.js': 'console.log("hello world");' }) => {
    const zip = new AdmZip();
    for (const [filePath, content] of Object.entries(files)) {
      zip.addFile(filePath, Buffer.from(content, 'utf8'));
    }
    return zip.toBuffer();
  };

  describe('File Extension & MIME Type Filtering', () => {
    const isAllowedArchive = (filename, mimetype) => {
      const ext = path.extname(filename || '').toLowerCase();
      if (ext !== '.zip') return false;
      const allowedMimes = [
        'application/zip',
        'application/x-zip-compressed',
        'multipart/x-zip',
        'application/octet-stream'
      ];
      if (mimetype && !allowedMimes.includes(mimetype.toLowerCase())) {
        return false;
      }
      return true;
    };

    it('permits genuine .zip archives with standard archive MIME types', () => {
      assert.strictEqual(isAllowedArchive('project.zip', 'application/zip'), true);
      assert.strictEqual(isAllowedArchive('my-app.ZIP', 'application/x-zip-compressed'), true);
      assert.strictEqual(isAllowedArchive('code.zip', 'application/octet-stream'), true);
    });

    it('rejects disallowed file extensions', () => {
      assert.strictEqual(isAllowedArchive('script.exe', 'application/octet-stream'), false);
      assert.strictEqual(isAllowedArchive('document.pdf', 'application/pdf'), false);
      assert.strictEqual(isAllowedArchive('archive.tar.gz', 'application/gzip'), false);
      assert.strictEqual(isAllowedArchive('test.js', 'application/javascript'), false);
    });

    it('rejects zip files with disallowed MIME types', () => {
      assert.strictEqual(isAllowedArchive('fake.zip', 'text/html'), false);
      assert.strictEqual(isAllowedArchive('malicious.zip', 'image/png'), false);
    });
  });

  describe('Binary Magic Byte Header Inspection', () => {
    const isValidZipHeader = (filePath) => {
      let fd;
      try {
        fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(4);
        const bytesRead = fs.readSync(fd, buffer, 0, 4, 0);
        if (bytesRead < 4) return false;
        const magic = buffer.readUInt32LE(0);
        return magic === 0x04034b50 || magic === 0x06054b50 || magic === 0x08074b50;
      } catch (err) {
        return false;
      } finally {
        if (fd !== undefined) {
          try { fs.closeSync(fd); } catch (e) {}
        }
      }
    };

    it('accepts genuine ZIP files with PK magic bytes (0x04034b50)', () => {
      const tempZipPath = path.join(os.tmpdir(), `test-magic-${Date.now()}.zip`);
      const validZipBuf = createValidZipBuffer();
      fs.writeFileSync(tempZipPath, validZipBuf);

      try {
        const isValid = isValidZipHeader(tempZipPath);
        assert.strictEqual(isValid, true, 'Genuine zip buffer must pass magic byte check');
      } finally {
        if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
      }
    });

    it('rejects disguised text/executable files renamed to .zip', () => {
      const fakeZipPath = path.join(os.tmpdir(), `fake-zip-${Date.now()}.zip`);
      fs.writeFileSync(fakeZipPath, 'This is just plain text masquerading as a zip file.');

      try {
        const isValid = isValidZipHeader(fakeZipPath);
        assert.strictEqual(isValid, false, 'Plain text file with .zip extension must be rejected');
      } finally {
        if (fs.existsSync(fakeZipPath)) fs.unlinkSync(fakeZipPath);
      }
    });
  });

  describe('Zip Slip & Path Traversal Prevention', () => {
    const isUnsafePath = (entryName, targetDir) => {
      if (entryName.includes('\0')) return true; // Null byte attack
      if ((path.isAbsolute(entryName) || path.win32.isAbsolute(entryName))) return true; // Absolute path escape
      if (entryName.includes('..') || entryName.includes('/..') || entryName.includes('\\..')) {
        return true;
      }
      const resolved = path.resolve(targetDir, entryName);
      if (!resolved.startsWith(path.resolve(targetDir) + path.sep)) {
        return true; // Path escapes sandbox boundary
      }
      return false;
    };

    it('detects and flags path traversal attempts (../../)', () => {
      const sandbox = path.join(os.tmpdir(), 'sandbox-test');
      assert.strictEqual(isUnsafePath('../../etc/passwd', sandbox), true);
      assert.strictEqual(isUnsafePath('..\\..\\Windows\\System32\\cmd.exe', sandbox), true);
      assert.strictEqual(isUnsafePath('subfolder/../../secret.env', sandbox), true);
    });

    it('detects null byte injection and absolute path escapes', () => {
      const sandbox = path.join(os.tmpdir(), 'sandbox-test');
      assert.strictEqual(isUnsafePath('safe_file.js\0.zip', sandbox), true);
      assert.strictEqual(isUnsafePath('/etc/shadow', sandbox), true);
      assert.strictEqual(isUnsafePath('C:\\Windows\\win.ini', sandbox), true);
    });

    it('permits safe relative project files inside the sandbox', () => {
      const sandbox = path.join(os.tmpdir(), 'sandbox-test');
      assert.strictEqual(isUnsafePath('src/index.js', sandbox), false);
      assert.strictEqual(isUnsafePath('package.json', sandbox), false);
      assert.strictEqual(isUnsafePath('components/Navbar.jsx', sandbox), false);
    });
  });

  describe('Zip Bomb & Resource Exhaustion Defense', () => {
    const MAX_FILES = 20000;
    const MAX_UNCOMPRESSED_TOTAL = 500 * 1024 * 1024; // 500MB

    const validateZipSafety = (zipEntries) => {
      if (zipEntries.length > MAX_FILES) {
        return { safe: false, reason: `Too many files (${zipEntries.length} > ${MAX_FILES})` };
      }
      let totalSize = 0;
      for (const entry of zipEntries) {
        totalSize += entry.header.size;
        if (totalSize > MAX_UNCOMPRESSED_TOTAL) {
          return { safe: false, reason: 'Uncompressed size exceeds 500MB limit' };
        }
      }
      return { safe: true };
    };

    it('permits archives within safe resource boundaries', () => {
      const mockEntries = [
        { header: { size: 1024 } },
        { header: { size: 2048 } }
      ];
      const result = validateZipSafety(mockEntries);
      assert.strictEqual(result.safe, true);
    });

    it('rejects archives exceeding 20,000 files count ceiling', () => {
      const mockEntries = new Array(20001).fill({ header: { size: 10 } });
      const result = validateZipSafety(mockEntries);
      assert.strictEqual(result.safe, false);
      assert.ok(result.reason.includes('Too many files'));
    });

    it('rejects archives exceeding 500MB uncompressed total size', () => {
      const mockEntries = [
        { header: { size: 600 * 1024 * 1024 } }
      ];
      const result = validateZipSafety(mockEntries);
      assert.strictEqual(result.safe, false);
      assert.ok(result.reason.includes('500MB limit'));
    });
  });

  describe('Safe Cleanup Verification', () => {
    it('cleans up temporary archive and sandbox folders cleanly without throwing', () => {
      const tempDir = path.join(os.tmpdir(), `cleanup-test-dir-${Date.now()}`);
      const tempFile = path.join(os.tmpdir(), `cleanup-test-file-${Date.now()}.zip`);

      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(tempFile, 'dummy content');

      assert.strictEqual(fs.existsSync(tempDir), true);
      assert.strictEqual(fs.existsSync(tempFile), true);

      // Safe cleanup logic
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });

      assert.strictEqual(fs.existsSync(tempDir), false);
      assert.strictEqual(fs.existsSync(tempFile), false);
    });
  });
});
