/* eslint-disable no-param-reassign */
function warpper(fn, user) {
  return function warpperFn(...args) {
    user.start(this);
    const result = fn(...args);
    user.end(this);
    return result;
  };
}

function beforeWarpper(fn, user) {
  return function warpperFn(...args) {
    user.before(this);
    return fn(...args);
  };
}

function afterWarpper(fn, user) {
  return function warpperFn(...args) {
    const result = fn(...args);
    user.after(this);
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
    //     const {
    //  entry, show, hide, destroy
    //  } = this.config;
    //     if (this.config.isComponent) {
    //       //
    //     } else {
    //       options.entry;
    //     }
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
