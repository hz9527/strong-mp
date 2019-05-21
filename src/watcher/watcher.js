import { Tree, Leaf } from './tree';
import { remove } from '../utils';

let id = 0;
export class Watcher {
  constructor(opt) {
    this.id = ++id;
    const {
      getter, cb, deep, lazy,
    } = opt;
    this.getter = getter;
    this.cb = cb;
    this.value = lazy === true ? undefined : this.getter();
    this.deep = !!deep;
  }

  update() {
    const old = this.value;
    this.value = this.getter();
    if (this.deep || this.value !== old) {
      this.cb(this.value, old);
    }
  }
}

function copyTree(tree) {
  const result = new Tree();
  result.isArray = tree.isArray;
  result.members = { ...tree.members };
  return result;
}

export default class StateManager {
  constructor(isArray = false) {
    this.map = {}; // key: [watchers]
    this.subs = new Set(); // watchers
    this.rest = new Set(); // keys
    this.tree = new Tree(isArray);
    this.cache = null;
    this.cacheRoot = null;
    this.onTree = this.onTree.bind(this);
    this.onLeaf = this.onLeaf.bind(this);
  }

  update(keys, value) {
    let cur = this.tree;
    for (let i = 0, l = keys.length - 1; i < l; i++) {
      const key = keys[i];
      if (cur.constructor === Tree) {
        if (!cur.members[key]) {
          if (process.env.NODE_ENV !== 'production') {
            if (typeof cur.isArray === 'boolean') {
              if (cur.isArray !== (typeof key === 'number')) {
                console.error(`${key} is invaild`);
              }
            }
          }
          cur.isArray = typeof key === 'number';
          cur.members[key] = new Tree();
        } else {
          cur.hasMerge = false;
        }
        cur = cur.members[key];
      } else {
        if (process.env.NODE_ENV !== 'production') {
          if (!cur[key] || typeof cur[key] !== 'object') {
            console.error(`${key} is not in ${cur}`);
          }
        }
        cur = cur[key];
      }
    }
    const rest = keys[keys.length - 1];
    let handler;
    if (cur.constructor === Tree) {
      if (typeof cur.isArray !== 'boolean') {
        cur.isArray = typeof key === 'number';
      }
      cur.hasMerge = false;
      handler = (key, v) => { cur.members[key] = new Leaf(v); };
    } else {
      handler = (key, v) => { cur[key] = v; };
    }
    if (rest.constructor !== Array) {
      handler(rest, value);
    } else {
      for (let i = 0, l = rest.length; i < l; i++) {
        handler(rest[i], value[i]);
      }
    }
  }

  notify(key, list) {
    this.rest.delete(key);
    for (let i = 0, l = list.length; i < l; i++) {
      this.subs.add(list[i]);
    }
  }

  onTree(key, tree, name) {
    if (this.cache.constructor !== Tree) {
      this.cache = this.cache[name];
    } else if (this.cache.members[name] && this.cache.members[name].constructor === Leaf) {
      this.cache = this.cache.members[name].value;
    } else {
      const copy = copyTree(tree);
      this.cache.members[name] = copy;
      this.cache = copy;
    }
    const list = this.map[key];
    list && this.notify(key, list);
  }

  onLeaf(key, leaf, name) {
    const keys = Array.from(this.rest);
    for (let i = 0, l = keys.length; i < l; i++) {
      const k = keys[i];
      k.indexOf(key) === 0 && this.notify(k, this.map[k]);
    }
    if (this.cache.constructor !== Tree) {
      this.cache[name] = leaf.value;
    } else {
      this.cache.members[name] = leaf;
    }
    this.cache = this.cacheRoot;
  }

  getSubs(tree) {
    this.cache = tree;
    this.cacheRoot = tree;
    this.rest = new Set(Object.keys(this.map));
    this.tree.walk('', this.onTree, this.onLeaf);
    const subs = Array.from(this.subs);
    this.subs.clear();
    this.tree.members = {};
    this.tree.hasMerge = false;
    return subs;
  }

  cleanCache() {
    this.cache = null;
    this.cacheRoot = null;
  }

  merge(data) {
    return this.tree.merge(data);
  }

  add(depName, watcher) {
    if (this.map[depName]) {
      this.map[depName].push(watcher);
    } else {
      this.map[depName] = [watcher];
    }
    return watcher;
  }

  remove(name, watcher) {
    const list = this.map[name];
    list && remove(list, watcher);
  }

  clear() {
    this.map = {};
  }
}
