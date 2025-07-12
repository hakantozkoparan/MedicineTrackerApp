// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase v9+ compatibility: Add support for .mjs and .cjs files.
// Some Firebase dependencies use these extensions.
const defaultSourceExts = config.resolver.sourceExts;
config.resolver.sourceExts = [...defaultSourceExts, 'mjs', 'cjs'];

// Add db extension for assets if needed by other packages
const defaultAssetExts = config.resolver.assetExts;
config.resolver.assetExts = defaultAssetExts.filter(ext => ext !== 'db'); // Avoid duplicates
config.resolver.assetExts.push('db');

module.exports = config;
