import Reaction from "./reaction";

const weakMap = new WeakMap();
const noop = () => {};

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
    obj[key] = noop;
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
  }
}
export const warpperWarpper = new Warpper({
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

export const componentWarpper = new Warpper({
  hooks: ['attached', 'ready', 'moved', 'error', 'resize'],
  isComponent: true,
  entry: 'created',
  show: 'show',
  hide: 'hide',
  destory: 'detached',
});