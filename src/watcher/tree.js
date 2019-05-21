/* eslint-disable no-nested-ternary */
/* eslint-disable no-param-reassign */

export class Leaf {
  constructor(value = '') {
    this.value = value;
  }
}

export class Tree {
  constructor(isArray) {
    this.members = {};
    this.isArray = typeof isArray === 'boolean' ? isArray : null;
    this.hasMerge = false;
  }

  walk(prefixKey, onTree, onLeaf) {
    const keys = Object.keys(this.members);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const newKey = prefixKey ? (this.isArray ? `${prefixKey}[${key}]` : `${prefixKey}.${key}`) : key;
      const child = this.members[key];
      if (child.constructor === Tree) {
        onTree(newKey, child, key);
        child.walk(newKey, onTree, onLeaf);
      } else {
        onLeaf(newKey, child, key);
      }
    }
  }

  merge(data) {
    if (this.hasMerge) return data;
    this.hasMerge = true;
    const result = this.isArray ? data.slice() : { ...data };
    const keys = Object.keys(this.members);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const child = this.members[key];
      if (child.constructor === Tree) {
        result[key] = child.merge(data[key]);
      } else {
        result[key] = child.value;
      }
    }
    return result;
  }
}
