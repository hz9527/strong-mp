class Leaf {
  constructor(value = '') {
    this.value = value;
  }
}

export default class Tree {
  constructor(isArray = false) {
    this.members = {};
    this.isArray = isArray;
  }

  update(keys, value, effect = () => {}) {
    let cur = this;
    for (let i = 0, l = keys.length - 1; i < l; i++) {
      const key = keys[i];
      effect(key, undefined, false);
      if (cur.constructor === Tree) {
        !cur.members.hasOwnProperty(key) && (cur.members[key] = new Tree(typeof key === 'number'));
        cur = cur.members[key];
      } else { // todo
        cur = cur[key];
      }
    }
    const rest = keys[keys.length - 1];
    const handler = cur.constructor === Tree
      ? (key, v) => {
        cur.members[key] = new Leaf(v);
        effect(key, v, cur.isArray, true);
      }
      : (key, v) => {
        cur[key] = v;
        effect(key, v, true, true);
      };
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
    getValue(this, '', result); // eslint-disable-line no-use-before-define
    return result;
  }
}

function getValue(tree, preKey, result) {
  const keys = Object.keys(tree.members);
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    const newKey = preKey ? `${preKey}${tree.isArray ? `[${key}]` : `.${key}`}` : key;
    const child = tree.members[key];
    if (child.constructor === Tree) {
      getValue(child, newKey, result);
    } else {
      result[newKey] = child.value; // eslint-disable-line no-param-reassign
    }
  }
}
