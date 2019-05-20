/* eslint-disable no-param-reassign */

export class Leaf {
  constructor(value = '') {
    this.value = value;
  }
}

export class Tree {
  constructor() {
    this.members = {};
    this.isArray = null;
  }

  getValue(prefixKey, onTree, onLeaf, result) {
    const keys = Object.keys(this.members);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const newKey = this.isArray ? `${prefixKey}[${key}]` : `${prefixKey}.${key}`;
      const child = this.members[key];
      if (child.constructor === Tree) {
        onTree(newKey, this.isArray);
        child.getValue(newKey, onTree, onLeaf, result);
      } else {
        onLeaf(newKey, child.value);
        result[newKey] = child.value;
      }
    }
  }

  merge(data) {
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
