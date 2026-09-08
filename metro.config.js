// Polyfill Array.prototype.toReversed for compatibility with Node.js versions < 20 (like Node v18)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude native build temporary files (.cxx, cmake tmp, gradle build outputs) from Metro file watcher
config.resolver.blockList = [
  /.*\/node_modules\/.*\/android\/\.cxx\/.*/,
  /.*\/android\/\.cxx\/.*/,
  /.*\/android\/app\/build\/.*/,
  /.*\/android\/\.gradle\/.*/,
];

module.exports = config;

