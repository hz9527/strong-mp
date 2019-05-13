/* eslint-disable no-param-reassign */
import { ComponentId } from './ctrl';

const noop = () => {};
function warpper(fn, user) {
  return function warpperFn(...args) {
    user.push(this);
    const result = fn(...args);
    user.pop(this);
    return result;
  };
}

function beforeWarpper(fn, user, hook) {
  return function warpperFn(...args) {
    hook === 'entry' ? user.init(this, hook) : user.run(this, hook);
    return fn(...args);
  };
}

function afterWarpper(fn, user, hook) {
  return function warpperFn(...args) {
    const result = fn(...args);
    user.run(this, hook);
    return result;
  };
}

function resolveComputed(context) {
  const { data, computed } = context;
  const proxy = {};
  const keys = Object.keys(computed);
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    if (data.hasOwnPerperty(key) || typeof computed[key] !== 'function') {
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

function warpperMethods(methods, user, checker = key => /(h|H)andler/.test(key)) {
  const keys = Object.keys(methods);
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    const fn = methods[key];
    if (typeof fn === 'function' && checker(key)) {
      methods[key] = warpper(fn, user);
    }
  }
}

function warpperLife(options, key, hook, user, isComponent, isAfter = false) {
  let obj = options;
  if (!isComponent) {
    if (typeof options[key] !== 'function') {
      options[key] = noop;
    }
  } else {
    const isLife = typeof options[key] !== 'function';
    if (options.lifetimes && typeof options.lifetimes[key] !== 'function' && isLife) {
      !options.lifetimes && (options.lifetimes = {});
      options.lifetimes[key] = noop;
    }
    obj = isLife ? options.lifetimes : options;
  }
  obj[key] = isAfter ? afterWarpper(obj[key], user, hook) : beforeWarpper(obj[key], user, hook);
}
let id = 0;

class Warpper {
  constructor(conf) {
    this.config = conf;
  }

  init(user) {
    this.ctrl = user;
  }

  resolve(options) {
    if (!options.data) {
      options.data = {};
    }
    if (this.config.isComponent) {
      options.data[ComponentId] = ++id;
      this.ctrl.addOptions(options);
    }
    if (options.computed) {
      let context = options;
      if (this.config.isComponent) {
        this.ctrl.registry(options);
        context = { data: options.data, computed: options.computed, ...options.methods };
      }
      const { data, computed } = resolveComputed(context);
      options.data = data;
      options.computed = computed;
    }
    let methods = options;
    let handler = (opt, key) => {
      if (typeof opt[key] === 'function') {
        opt[key] = warpper(opt[key], this.ctrl);
      }
    };
    if (this.config.isComponent) {
      methods = options.methods || {};
      const old = handler;
      handler = (opt, key) => {
        if (opt.lifetimes && opt.lifetimes[key]) {
          old(opt.lifetimes, key);
        } else if (opt.pageLifetimes && opt.pageLifetimes[key]) {
          old(opt.pageLifetimes, key);
        } else {
          old(opt, key);
        }
      };
    }
    warpperMethods(methods, this.ctrl);
    for (let i = 0, l = this.config.hooks.length; i < l; i++) {
      handler(options, this.config.hooks[i]);
    }
    const {
      entry, show, hide, destroy,
    } = this.config;
    warpperLife(options, entry, 'entry', this.ctrl, this.config.isComponent);
    warpperLife(options, show, 'show', this.ctrl, this.config.isComponent);
    warpperLife(options, hide, 'hide', this.ctrl, this.config.isComponent);
    warpperLife(options, destroy, 'destroy', this.ctrl, this.config.isComponent, true);
    return options;
  }
}

export const pageMixin = new Warpper({
  hooks: [
    'onLoad',
    'onShow',
    'onHide',
    'onUnload',
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

export const componentMixin = new Warpper({
  hooks: [
    'created',
    'show',
    'hide',
    'detached',
    'attached',
    'ready',
    'moved',
    'error',
    'resize',
  ],
  isComponent: true,
  entry: 'created',
  show: 'show',
  hide: 'hide',
  destory: 'detached',
});
