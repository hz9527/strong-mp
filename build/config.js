const path = require('path');
const replacePlugin = require('rollup-plugin-replace');
const { terser } = require('rollup-plugin-terser');

const resolve = (p = '') => path.resolve(__dirname, '../src/', p);

const baseConfig = {
  input: {
    input: resolve('./index.js'),
    plugins: [],
  },
  output: {
    file: resolve('../dist/index.js'),
    format: 'esm',
  },
};

function genItem(mpEnv = 'tt', isBuild = false) {
  const result = { ...baseConfig };
  result.plugins = result.plugins.slice();
  result.plugins.push(replacePlugin({
    'process.env.MP_ENV': JSON.stringify(mpEnv),
    'process.env.NODE_ENV': JSON.stringify(isBuild ? 'production' : 'development'),
  }));
  if (isBuild) result.plugins.push(terser());
  return result;
}

const MpEnvs = ['tt', 'wx'];

function genConfigs(isBuild = false) {
  const list = isBuild
    ? MpEnvs.map(key => [key])
    : MpEnvs.reduce((res, key) => res.concat([[key, true], [key, false]]), []);
  return list.map(item => genItem(...item));
}

module.exports = genConfigs;
