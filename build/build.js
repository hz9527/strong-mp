const rollup = require('rollup');
const genConfig = require('./config');

const configs = genConfig(false);
function bundle({ input, output }) {
  console.log(output);
  return rollup.rollup(input)
    .then(r => r.write(output));
}
Promise.all(configs.map(config => bundle(config)))
  .then(() => console.log('build success'), console.log);
