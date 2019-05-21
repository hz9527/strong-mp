/* eslint-disable no-nested-ternary */
/* eslint-disable no-param-reassign */

class Leaf {
  constructor(value = '') {
    this.value = value;
  }
}

class Tree {
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

const noop = () => {};

function remove(list, item) {
  const ind = list.indexOf(item);
  return ind > -1 ? list.splice(ind, 1) : item;
}

function pathToArr(str) {
  const preStr = str[0] === '[' ? str : `.${str}`;
  // eslint-disable-next-line no-useless-escape
  const result = preStr.match(/(\[(\d+)\]|\.[^\.\[]+)/g) || [];
  return result.map(item => (item[0] === '[' ? Number(item.slice(1, -1)) : item.replace('.', '')));
}

let id = 0;
class Watcher {
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

class StateManager {
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
          {
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
        {
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

/* eslint-disable prefer-destructuring */

class User {
  constructor(reaction) {
    const { stateManager, deps } = reaction;
    this.add = stateManager.add.bind(stateManager);
    this.remove = stateManager.remove.bind(stateManager);
    this.deps = deps;
  }
}

function initComputed(computed, reaction, app) {
  const keys = Object.keys(computed);
  // eslint-disable-next-line no-param-reassign
  app.computed = {};
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    // deps: [[key], [user, [key]]]
    const { deps, get } = computed[key];
    const getter = get.bind(app, reaction.getValue);
    const cb = now => reaction.setState({ [key]: now });
    const watcher = new Watcher({ getter, cb, lazy: true });
    Object.defineProperty(app.computed, key, {
      get: getter,
    });
    for (let j = 0, dl = deps.length; j < dl; j++) { // todo
      const list = deps[j];
      let dep;
      let stateManager;
      if (list[0].constructor === User) {
        stateManager = list[0];
        stateManager.deps.add(reaction);
        dep = list[1];
      } else {
        dep = list;
        stateManager = reaction.stateManager;
      }
      if (!reaction.userMap.has(stateManager)) {
        reaction.userMap.set(stateManager, new Set());
      }
      const watchers = reaction.userMap.get(stateManager);
      watchers.add(watcher);
      for (let k = 0, n = dep.length; k < n; k++) {
        stateManager.add(dep[k], watcher);
      }
    }
  }
}

function initWatch(watch, reaction, app) {
  const keys = Object.keys(watch);
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    const { handler, user, deep } = watch[key];
    const stateManager = user || reaction.stateManager;
    if (user) stateManager.deps.add(reaction);
    if (!reaction.userMap.has(stateManager)) {
      reaction.userMap.set(stateManager, new Set());
    }
    const watchers = reaction.userMap.get(stateManager);
    const source = user ? stateManager.getState : reaction.getState;
    const paths = pathToArr(key);
    const getter = () => {
      let cur = source();
      let j = 0;
      const len = paths.length;
      try {
        while (j < len) {
          cur = cur[paths[j++]];
        }
        return cur;
      } catch (err) {
        return undefined;
      }
    };
    const cb = handler.bind(app);
    const watcher = new Watcher({ getter, cb, deep });
    watchers.add(watcher);
    stateManager.add(key, watcher);
  }
}

// user add remove from stateManager; data from app

class Reaction {
  constructor() {
    this.stack = 0;
    this.isRun = false;
    this.cbs = [];
    this.status = 0; // -1 hide 0 init 1 hasShow
    this.lastState = null;
    this.data = null;
    this.stateManager = new StateManager(false);
    this.userMap = new Map(); // stateManager: [watcher]
    this.deps = new Set(); // <reaction>
    this.runCbs = this.runCbs.bind(this);
    this.getState = this.getState.bind(this);
    this.setState = this.setState.bind(this);
  }

  init(app, opt) {
    {
      if (app.data.constructor !== Object) {
        console.error(`${app.data} must be plain object`);
      }
    }
    this.data = app.data;
    this.lastState = this.data;
    this.setData = app.setData.bind(app);
    // eslint-disable-next-line no-param-reassign
    app.setState = this.setState;
    if (opt.computed) {
      initComputed(opt.computed, this, app);
    }
    if (opt.watch) {
      initWatch(opt.watch, this, app);
    }
  }

  setState(newState, cb) {
    const state = typeof newState === 'function' ? newState(this.getState) : newState;
    if (!state) return;
    if (state.constructor === Object) {
      const keys = Object.keys(state);
      const value = keys.length === 1 ? state[keys[0]] : keys.map(key => state[key]);
      this.setDeepState(keys.length === 1 ? keys : [keys], value, cb);
    } else { // todo check invalid
      this.setDeepState(state[0], state[1], cb);
    }
  }

  setDeepState(keys, value, cb) {
    {
      if (!this.isRun) {
        console.time('debug');
      }
    }
    this.isRun = true;
    keys && this.stateManager.update(keys, value);
    typeof cb === 'function' && this.cbs.push(cb);
    this.stack === 0 && this.run();
  }

  run() {
    const result = new Tree(false);
    this.deps.forEach(item => item.push());
    this.push();
    while (this.isRun) {
      this.getState(); // todo call shouldUpdate hook
      this.isRun = false;
      const subs = this.stateManager.getSubs(result);
      subs.sort((a, b) => a.id - b.id);
      for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update();
      }
    }
    this.deps.forEach(item => item.pop());
    this.stack--;
    const newData = {};
    result.walk('', noop, (key, child) => {
      newData[key] = child.value;
    });
    this.stateManager.cleanCache();
    console.log('setData:', newData);
    {
      console.timeEnd('debug');
    }
    this.setData(newData, this.runCbs);
    this.lastState = this.data;
  }

  runCbs() {
    const list = this.cbs.slice();
    this.cbs.length = 0;
    for (let i = 0, l = list.length; i < l; i++) {
      list[i]();
    }
  }

  getState() {
    if (this.isRun) {
      this.lastState = this.stateManager.merge(this.lastState);
    }
    return this.lastState;
  }

  push() {
    this.stack++;
  }

  pop() {
    this.stack--;
    this.stack === 0 && this.isRun && this.status !== -1 && this.run();
  }

  play() {
    this.status !== 0 && this.run();
    this.status = 1;
  }

  stop() {
    this.status = -1;
  }

  destory() {
    // todo
    console.log(this);
  }
}

/* eslint-disable no-param-reassign */

function warpperFactory(reaction, fn) {
  return function warpper(...args) {
    reaction.push();
    const result = fn.call(this, ...args);
    reaction.pop();
    return result;
  };
}
// {data, computed, watch, hook, other, methods}
class Resolver {
  constructor(config) {
    const {
      hooks, resolver, create, stop, play, destory,
    } = config;
    this.hooks = hooks;
    this.resolver = resolver;
    this.lifes = {
      create, stop, play, destory,
    };
  }

  resolve(option) {
    const {
      create, stop, play, destory,
    } = this.lifes;
    const old = typeof option[create] === 'function' ? option[create] : noop;
    const warppers = option.methods || {};
    const { hooks } = this;
    option[create] = function createApp(opt) {
      const reaction = new Reaction();
      reaction.init(this, option);
      // init lifes
      const oldPlay = this[play];
      this[play] = function appPlay(...args) {
        reaction.push();
        reaction.play();
        const result = oldPlay.call(this, ...args);
        reaction.pop();
        return result;
      };
      const oldStop = warpperFactory(reaction, this[stop]);
      this[stop] = function appStop(...args) {
        const result = oldStop.call(this, ...args);
        reaction.stop();
        return result;
      };
      const oldDestory = warpperFactory(reaction, this[destory]);
      this[destory] = function destoryApp(...args) {
        const result = oldDestory.call(this, ...args);
        reaction.destory();
        return result;
      };
      // init hooks
      let i = hooks.length;
      while (i--) {
        const hook = hooks[i];
        if (typeof this[hook] === 'function') {
          this[hook] = warpperFactory(reaction, this[hook]);
        }
      }
      // init warpper function
      const keys = Object.keys(warppers);
      i = keys.length;
      while (i--) {
        const key = keys[i];
        this[key] = warpperFactory(reaction, this[key]);
      }
      const result = old(opt);
      return result;
    };
    return this.resolver(option);
  }
}

const pageResolver = new Resolver({
  hooks: [
    'onReady',
    'onPullDownRefresh',
    'onReachBottom',
    'onShareAppMessage',
    'onPageScroll',
    'onResize',
    'onTabItemTap',
  ],
  create: 'onLoad',
  play: 'onShow',
  stop: 'onHide',
  destory: 'onUnload',
  resolver(option) {
    const { methods, ...rest } = option;
    return { data: {}, ...rest, ...methods };
  },
});

const PageLife = new Set(['resize', 'hide', 'show']);
const Life = new Set(['attached', 'ready', 'moved', 'detached', 'error']);
const componentResolver = new Resolver({
  hooks: ['attached', 'ready', 'moved', 'error', 'resize'],
  create: 'created',
  play: 'show',
  stop: 'hide',
  destory: 'detached',
  resolver(option) {
    const { methods, ...rest } = option;
    const pageLifetimes = {};
    const lifetimes = {};
    const base = {};
    const keys = Object.keys(rest);
    let i = keys.length;
    while (i--) {
      const key = keys[i];
      if (PageLife.has(key)) {
        pageLifetimes[key] = rest[key];
      } else if (Life.has(key)) {
        lifetimes[key] = rest[key];
      } else if (typeof rest[key] === 'function') {
        methods[key] = rest[key];
      } else {
        base[key] = rest[key];
      }
    }
    return {
      data: {}, ...base, pageLifetimes, lifetimes, methods,
    };
  },
});

function pageHandler(opt) {
  return pageResolver.resolve(opt);
}

function componentHander(opt) {
  return componentResolver.resolve(opt);
}

export { componentHander, pageHandler };
