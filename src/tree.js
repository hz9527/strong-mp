import { noop } from './utils';

class Leaf {
  constructor(value = '') {
    this.value = value;
  }
}

let preKey = '';
function prefixKey(key, tree) {
  preKey = preKey ? `${preKey}${tree.isArray ? `[${key}]` : `.${key}`}` : key;
  return preKey;
}

function getValueFactory(result) {
  return (key, value, tree) => {
    result[prefixKey(key, tree)] = value; // eslint-disable-line no-param-reassign
    preKey = '';
  };
}

export default class Tree {
  constructor(isArray = false) {
    this.members = {};
    this.isArray = isArray;
  }

  update(keys, value) {
    let cur = this;
    for (let i = 0, l = keys.length - 1; i < l; i++) {
      const key = keys[i];
      if (cur.constructor === Tree) {
        if (!cur.members[key]) {
          cur.isArray = typeof key === 'number';
          cur.members[key] = new Tree();
        }
        cur = cur.members[key];
      } else { // todo
        cur = cur[key];
      }
    }
    const rest = keys[keys.length - 1];
    const handler = cur.constructor === Tree
      ? (key, v) => { cur.members[key] = new Leaf(v); }
      : (key, v) => { cur[key] = v; };
    if (rest.constructor !== Array) {
      handler(rest, value);
    } else {
      for (let i = 0, l = rest.length; i < l; i++) {
        handler(rest[i], value[i]);
      }
    }
  }

  getValue() {
    const result = {};
    this.walk(getValueFactory(result), prefixKey);
    return result;
  }

  merge(data) {
    const result = { ...data };
    let tem = result;
    this.walk(
      (k, v) => {
        tem[k] = v;
        tem = result;
      },
      (k, tree) => {
        tem[k] = tree.isArray ? tem[k].slice() : { ...tem[k] };
        tem = tem[k];
      },
    );
    return result;
  }

  walk(onLeaf = noop, onTree = noop) { // todo
    const keys = Object.keys(this.members);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const child = this.members[key];
      if (child.constructor === Tree) {
        onTree(key, this);
        child.walk(onLeaf, onTree);
      } else {
        onLeaf(key, child.value, this);
      }
    }
  }
}
