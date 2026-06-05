const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration for Fheli Biometrics
 * https://reactnative.dev/docs/metro
 *
 * Uses a custom resolver to shim Node.js built-in modules
 * that snarkjs transitively requires. Actual ZK proof
 * verification runs on the Datalake 3.0 server gateway.
 */
const EMPTY_SHIM = require.resolve('./shims/empty-module');

// All Node.js built-in modules that need shimming
const NODE_BUILTINS = [
  'crypto', 'readline', 'fs', 'path', 'os', 'stream',
  'worker_threads', 'events', 'util', 'buffer', 'url',
  'http', 'https', 'net', 'tls', 'zlib', 'assert',
  'child_process', 'cluster', 'dgram', 'dns', 'domain',
  'module', 'punycode', 'querystring', 'string_decoder',
  'sys', 'timers', 'tty', 'v8', 'vm', 'constants',
  'perf_hooks',
];

const nodeBuiltinsMap = {};
NODE_BUILTINS.forEach(mod => { nodeBuiltinsMap[mod] = EMPTY_SHIM; });

const config = {
  resolver: {
    extraNodeModules: nodeBuiltinsMap,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
