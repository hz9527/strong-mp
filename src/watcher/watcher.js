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


export default class StateManager {
  constructor(isArray = false) {
    this.map = {}; // key: [watchers]
    this.subs = new Set(); // watchers
    this.rest = new Set(); // keys
    this.tree = new Tree(isArray);
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

  onTree(key) {
    const list = this.map[key];
    list && this.notify(key, list);
  }

  onLeaf(key) {
    const keys = Array.from(this.rest);
    for (let i = 0, l = keys.length; i < l; i++) {
      const k = keys[i];
      k.indexOf(key) === 0 && this.notify(k, this.map[k]);
    }
  }

  getValue() {
    // todo set object <-> add key fail
    const result = {};
    this.rest = new Set(Object.keys(this.map));
    this.tree.getValue('', this.onTree, this.onLeaf, result);
    const subs = Array.from(this.subs);
    this.subs.clear();
    this.tree.members = {};
    this.tree.hasMerge = false;
    return { result, subs };
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
