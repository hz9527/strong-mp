import StateManager from './watcher/watcher';
import { initWatch, initComputed } from './helper';

export default class Reaction {
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
    if (process.env.NODE_ENV !== 'production') {
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
    this.isRun = true;
    keys && this.stateManager.update(keys, value);
    typeof cb === 'function' && this.cbs.push(cb);
    this.stack === 0 && this.run();
  }

  run() {
    let newData = {};
    this.deps.forEach(item => item.push());
    this.push();
    while (this.isRun) {
      this.getState(); // todo call shouldUpdate hook
      this.isRun = false;
      const { result, subs } = this.stateManager.getValue(newData); // todo
      newData = result;
      for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update(); // todo sort & stack
      }
    }
    this.deps.forEach(item => item.pop());
    this.stack--;
    console.log('setData:', newData);
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
