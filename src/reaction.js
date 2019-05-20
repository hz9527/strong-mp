import StateManager from './watcher/watcher';
import { initWatch, initComputed } from './helper';

export default class Reaction {
  constructor() {
    this.stack = 0;
    this.isRun = false;
    this.cbs = [];
    this.status = 0;
    this.lastState = null;
    this.data = null;
    this.stateManager = new StateManager(false);
    this.userMap = new Map(); // stateManager
    this.deps = new Set(); // reaction
    this.runCbs = this.runCbs.bind(this);
    this.getState = this.getState.bind(this);
    this.setState = this.setState.bind(this);
  }

  init(app, opt) {
    if (process.env.NODE_ENV !== 'production') {
      if (app.data.constructor !== Object) {
        console.error(`${app.data} must be plain object`);
      }
    }
    this.data = app.data;
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
    if (!state) {
      this.setDeepState(null, null, cb);
    } else if (state.constructor === Object) {
      const keys = Object.keys(state);
      const value = keys.length === 1 ? state[keys[0]] : keys.map(key => state[key]);
      this.setDeepState(keys.length === 1 ? keys : [keys], value, cb);
    } else { // todo check invalid
      this.setDeepState(state[0], state[1], cb);
    }
  }

  setDeepState(keys, value, cb) {
    this.isRun = true;
    this.lastState = null;
    keys && this.stateManager.update(keys, value);
    typeof cb === 'function' && this.cbs.push(cb);
    this.stack === 0 && this.run();
  }

  run() {
    let newData = {};
    this.deps.forEach(item => item.push());
    this.push();
    while (this.isRun) {
      this.isRun = false;
      const { result, subs } = this.stateManager.getValue();
      newData = { ...newData, ...result };
      for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update(); // todo sort & stack
      }
    }
    this.deps.forEach(item => item.pop());
    this.stack--;
    this.setData(newData, this.runCbs);
  }

  runCbs() {
    const list = this.cbs.slice();
    this.cbs.length = 0;
    for (let i = 0, l = list.length; i < l; i++) {
      list[i]();
    }
  }

  getState() {
    if (!this.lastState) {
      this.lastState = this.stateManager.merge(this.data);
    }
    return this.lastState;
  }
}
