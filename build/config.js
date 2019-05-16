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
    format: 'esm',
  },
};

function getBasePath(isBuild) {
  return isBuild ? '../dist/index' : '../demo/libs/index';
}

function genItem(mpEnv = 'tt', isBuild = false) {
  const { input, output } = baseConfig;
  const result = {
    input: { ...input },
    output: { ...output },
  };
  result.input.plugins = result.input.plugins.slice();
  result.input.plugins.push(replacePlugin({
    'process.env.MP_ENV': JSON.stringify(mpEnv),
    'process.env.NODE_ENV': JSON.stringify(isBuild ? 'production' : 'development'),
  }));
  if (isBuild) result.input.plugins.push(terser());
  result.output.file = resolve(`${getBasePath(isBuild)}${isBuild ? '' : '.debug'}${mpEnv === 'wx' ? '.wx' : ''}.js`);
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
