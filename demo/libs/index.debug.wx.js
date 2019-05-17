// eslint-disable-next-line import/prefer-default-export
const noop = () => {};

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

class Tree {
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

/* eslint-disable no-underscore-dangle */

class Reaction {
  constructor(app, opt) {
    this.stack = 0;
    this.isRun = false;
    this.tree = new Tree();
    this.cbs = [];
    this.status = 0; // 0 before onload; 1 onload but not show; -1 hide
    this.app = app;
    this.cacheState = null;
    this.runCbs = this.runCbs.bind(this);
    this.getState = this.getState.bind(this);
    app.setState = this.setState.bind(this); // eslint-disable-line no-param-reassign
    if (opt.computed) {
      this.computedKeys = Object.keys(opt.computed);
      this.computed = {};
      app.computed = app.computed || {}; // eslint-disable-line no-param-reassign
      for (let i = 0, l = this.computedKeys.length; i < l; i++) {
        const key = this.computedKeys[i];
        this.computed[key] = opt.computed[key].bind(app);
        Object.defineProperty(app.computed, key, {
          get: () => this.computed[key](this.getState()),
        });
      }
    }
  }

  getState() {
    if (!this.cacheState) {
      this.cacheState = this.tree.merge(this.app.data);
    }
    return this.cacheState;
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
    this.isRun = true;
    this.cacheState = null;
    keys && this.tree.update(keys, value);
    typeof cb === 'function' && this.cbs.push(cb);
    this.stack === 0 && this.run();
  }

  run() {
    this.isRun = false;
    const data = this.updateComputed();
    const result = this.tree.getValue();
    if (data) {
      const keys = Object.keys(data);
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i];
        result[key] = data[key];
      }
    }
    {
      console.log('setData:', result);
    }
    this.tree.members = {};
    this.app.setData(result, this.runCbs);
  }

  runCbs() {
    const list = this.cbs.slice();
    this.cbs.length = 0;
    for (let i = 0, l = list.length; i < l; i++) {
      list[i]();
    }
  }

  push() {
    this.stack++;
  }

  pop() {
    this.stack--;
    this.stack === 0 && this.isRun && this.status !== -1 && this.run();
  }

  show() {
    this.status !== 0 && this.run();
    this.status = 1;
  }

  hide() {
    this.status = -1;
  }

  destory() {
    delete this.app.setState;
    this.app.computed = null;
    this.app = null;
    this.tree = null;
    this.cacheState = null;
  }

  updateComputed(first = true) {
    if (!this.computedKeys) return null;
    let data = {};
    first && this.push(); // 保证了computed 内 setSate 不引发新的 run
    const state = this.getState();
    for (let i = 0, l = this.computedKeys.length; i < l; i++) {
      const key = this.computedKeys[i];
      const value = this.computed[key](state);
      if (this.isRun) break;
      value !== this.app.data[key] && (data[key] = value);
    }
    if (this.isRun) {
      this.isRun = false;
      data = this.updateComputed(false);
    }
    this.stack--;
    return data;
  }
}

const weakMap = new WeakMap();
const noop$1 = () => {};

function resolveComputed(context) {
  const { data, computed } = context;
  const proxy = {};
  const keys = Object.keys(computed);
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    if (data.hasOwnProperty(key) || typeof computed[key] !== 'function') {
      delete computed[key];
    } else {
      const get = computed[key].bind(context, data);
      Object.defineProperty(proxy, key, { get });
    }
  }
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    data[key] = proxy[key] || data[key];
  }
  return { data, computed };
}

function warpper(fn) {
  return function warpperFn(...args) {
    const reaction = weakMap.get(this);
    reaction.push();
    const result = fn.call(this, ...args);
    reaction.pop();
    return result;
  }
}

function hookWarpper(opt, key) {
  if (typeof opt[key] === 'function') {
    opt[key] = warpper(opt[key]);
  }
}

function comHookWarpper(opt, key) {
  if (opt.lifetimes && opt.lifetimes[key]) {
    hookWarpper(opt.lifetimes, key);
  } else if (opt.pageLifetimes && opt.pageLifetimes[key]) {
    hookWarpper(opt.pageLifetimes, key);
  } else {
    hookWarpper(opt, key);
  }
}

function methodsWarpper(methods, checker = key => /(h|H)andler/.test(key)) {
  const keys = Object.keys(methods);
  let i = keys.length;
  while(i--) {
    const key = keys[i];
    const fn = methods[key];
    if (typeof fn === 'function' && checker(key)) {
      methods[key] = warpper(fn);
    }
  }
}
function entryWapper(fn, opt) {
  const hook = warpper(fn);
  return function warpperFn(...args) {
    const reaction = new Reaction(this, opt || this);
    weakMap.set(this, reaction);
    return hook.call(this, ...args);
  }
}
function lifeWapperFactory(key) {
  return fn => function warpperFn(...args) {
    const reaction = weakMap.get(this);
    reaction.push();
    reaction[key]();
    const result = fn.call(this, ...args);
    reaction.pop();
    return result;
  }
}

const showWapper = lifeWapperFactory('show');
const hideWapper = lifeWapperFactory('hide');

function destoryWarpper(fn) {
  return function warpperFn() {
    const result = fn.call(fn);
    const reaction = weakMap.get(this);
    reaction && reaction.destory();
    return result;
  }
}

function lifeWapper(opt, key, isComponent, warpper) {
  let obj = opt;
  if (!isComponent && opt.lifetimes && !opt[key]) {
    obj = opt.lifetimes;
  }
  if (typeof obj[key] !== 'function') {
    obj[key] = noop$1;
  }
  obj[key] = warpper(obj[key], isComponent ? opt : null);
}

class Warpper {
  constructor(config) {
    this.config = config;
  }
  resolve(options) {
    if (!options.data) {
      options.data = {};
    }
    const isComponent = this.config.isComponent;
    let methods = options;
    let hookResolver = hookWarpper;
    if (isComponent) {
      methods = options.methods || {};
      hookResolver = comHookWarpper;
    }
    // init computed
    if (options.computed) {
      let context = options;
      if (isComponent) {
        context = { data: options.data, computed: options.computed, ...(options.methods || {}) };
      }
      const { data, computed } = resolveComputed(context);
      options.data = data;
      options.computed = computed;
    }
    // warpper method
    methodsWarpper(methods, this.ctrl);
    // warpper hooks
    for (let i = 0, l = this.config.hooks.length; i < l; i++) {
      hookResolver(options, this.config.hooks[i]);
    }
    // base hooks
    const { entry, show, hide, destroy } = this.config;
    lifeWapper(options, entry, isComponent, entryWapper);
    lifeWapper(options, show, isComponent, showWapper);
    lifeWapper(options, hide, isComponent, hideWapper);
    lifeWapper(options, destroy, isComponent, destoryWarpper);
    return options;
  }
}
const pageWarpper = new Warpper({
  hooks: [
    'onReady',
    'onPullDownRefresh',
    'onReachBottom',
    'onShareAppMessage',
    'onPageScroll',
    'onResize',
    'onTabItemTap',
  ],
  entry: 'onLoad',
  show: 'onShow',
  hide: 'onHide',
  destory: 'onUnload',
});

const componentWarpper = new Warpper({
  hooks: ['attached', 'ready', 'moved', 'error', 'resize'],
  isComponent: true,
  entry: 'created',
  show: 'show',
  hide: 'hide',
  destory: 'detached',
});

function init(oldPage = Page, oldComponent = Component) {
  function page(options) {
    return oldPage(pageWarpper.resolve(options));
  }
  function component(options) {
    return oldComponent(componentWarpper.resolve(options));
  }
  return { page, component };
}

export default init;
