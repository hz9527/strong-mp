const rollup = require('rollup');
const genConfigs = require('./config');

genConfigs(false).forEach(({ input, output }) => {
  rollup.watch({ ...input, output });
});
