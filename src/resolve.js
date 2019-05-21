/* eslint-disable no-param-reassign */
import Reaction from './reaction';
import { noop } from './utils';

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

export const pageResolver = new Resolver({
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
export const componentResolver = new Resolver({
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
