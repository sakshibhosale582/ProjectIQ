'use strict';
const AdmZip = require('adm-zip');
const path = require('path');
const { isSecretFile, isSensitiveOrBinary, isReadableSource, getFilePriority } = require('./scanner');

const LIMITS = {
  MAX_ENTRIES: 20000,
  MAX_EXTRACTED_SIZE: 500 * 1024 * 1024,   // declared uncompressed total (zip-bomb guard)
  MAX_SINGLE_FILE_SIZE: 100 * 1024 * 1024,
  MAX_READ_FILE_SIZE: 400 * 1024,          // text files above this are counted but not analysed
  MAX_TOTAL_READ: 80 * 1024 * 1024          // total text we keep in memory per upload
};

class ZipValidationError extends Error {
  constructor(message) { super(message); this.name = 'ZipValidationError'; this.status = 400; }
}

/** True if any path segment is exactly ".." (so a file named "a..b.js" is fine). */
const hasTraversalSegment = (name) => name.split(/[\\/]/).some(seg => seg === '..');

const validateEntryName = (entryName) => {
  if (entryName.includes('\0')) throw new ZipValidationError('Security Alert: Null byte detected in ZIP entry path.');
  if (
    hasTraversalSegment(entryName) || entryName.startsWith('/') || entryName.startsWith('\\') ||
    /^[a-zA-Z]:/.test(entryName) || path.posix.isAbsolute(entryName) || path.win32.isAbsolute(entryName)
  ) {
    throw new ZipValidationError(`Security Alert: Suspicious file path detected in ZIP entry: ${entryName}`);
  }
};

const isSymlink = (entry) => Boolean(entry.isSymbolicLink || (entry.attr && ((entry.attr >>> 16) & 0o170000) === 0o120000));

/**
 * Validates the archive and reads it fully in memory (nothing is written to disk).
 * @returns {{allPaths:string[], secretPaths:string[], fileMap:Object<string,string>, stats:Object}}
 */
const readArchive = (zipPath, limits = LIMITS) => {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  if (entries.length > limits.MAX_ENTRIES) {
    throw new ZipValidationError(`Security Alert: ZIP contains too many files (max ${limits.MAX_ENTRIES}).`);
  }

  let declaredTotal = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const size = (entry.header && entry.header.size) || 0;
    if (size > limits.MAX_SINGLE_FILE_SIZE) {
      throw new ZipValidationError(`Security Alert: File ${entry.entryName} exceeds single file size limit (max 100MB).`);
    }
    declaredTotal += size;
  }
  if (declaredTotal > limits.MAX_EXTRACTED_SIZE) {
    throw new ZipValidationError('Security Alert: Total extracted size exceeds limit (max 500MB).');
  }

  // Validate every path first, then read the most important files first
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    validateEntryName(entry.entryName);
    if (isSymlink(entry)) continue;
    files.push({ entry, name });
  }
  files.sort((a, b) => getFilePriority(b.name) - getFilePriority(a.name));

  const allPaths = [];
  const secretPaths = [];
  const fileMap = {};
  let totalRead = 0;
  const stats = { filesInArchive: files.length, filesTooLarge: 0, filesUnreadable: 0, filesBudgetSkipped: 0, bytesRead: 0 };

  for (const { entry, name } of files) {
    if (isSecretFile(name)) { secretPaths.push(name); continue; }   // reported, never read
    if (isSensitiveOrBinary(name)) continue;
    allPaths.push(name);

    if (!isReadableSource(name)) continue;
    const declared = (entry.header && entry.header.size) || 0;
    if (declared > limits.MAX_READ_FILE_SIZE) { stats.filesTooLarge++; continue; }
    if (totalRead + declared > limits.MAX_TOTAL_READ) { stats.filesBudgetSkipped++; continue; }
    try {
      const buf = entry.getData();
      if (buf.length > limits.MAX_READ_FILE_SIZE) { stats.filesTooLarge++; continue; }
      if (buf.includes(0)) { stats.filesUnreadable++; continue; } // binary content
      fileMap[name] = buf.toString('utf8');
      totalRead += buf.length;
    } catch (err) {
      stats.filesUnreadable++;
    }
  }
  stats.bytesRead = totalRead;
  return { allPaths, secretPaths, fileMap, stats };
};

module.exports = { readArchive, validateEntryName, hasTraversalSegment, ZipValidationError, LIMITS };
