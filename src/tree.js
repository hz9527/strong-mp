import { noop } from './utils';

class Leaf {
  constructor(value = '') {
    this.value = value;
  }
}

let preKey = '';
function prefixKey(key) {
  preKey = preKey ? `${preKey}${typeof key === 'number' ? `[${key}]` : `.${key}`}` : key;
  return preKey;
}

function getValueFactory(result) {
  return (key, value) => {
    result[prefixKey(key)] = value; // eslint-disable-line no-param-reassign
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
        !cur.members[key] && (cur.members[key] = new Tree(typeof key === 'number'));
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
    let result = data;
    const keys = [];
    this.walk(
      (k, v) => {
        result = { ...result };
        let obj = result;
        for (let i = 0, l = keys.length; i < l; i++) {
          const key = keys[i];
          obj[key] = { ...obj[key] };
          obj = obj[key];
        }
        console.log(v);
        obj[k] = v;
      },
      (k, tree) => {
        keys.push(tree.isArray ? Number(k) : k);
      },
    );
    return result;
  }

  walk(onLeaf = noop, onTree = noop) {
    const keys = Object.keys(this.members);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const child = this.members[key];
      if (child.constructor === Tree) {
        onTree(key, this);
        child.walk(onLeaf, onTree);
      } else {
        onLeaf(key, child.value);
      }
    }
  }
}
