/* eslint-disable no-underscore-dangle */
import Tree from './tree';

export default class Reaction {
  constructor(app, opt) {
    this.stack = 0;
    this.isRun = false;
    this.state = {};
    this.tree = new Tree();
    this.cbs = [];
    this.runCbs = this.runCbs.bind(this);
    this.status = 0; // 0 before onload; 1 onload but not show; -1 hide
    let cur = this.state;
    this.effect = (key, value, isArray, isLeaf) => {
      if (!isLeaf) {
        if (!cur[key]) isArray ? (cur[key] = []) : (cur[key] = {});
        cur = cur[key];
      } else {
        cur[key] = value;
        cur = this.state;
      }
    };
    app.setState = this.setState.bind(this); // eslint-disable-line no-param-reassign
    this.app = app;
    if (opt.computed) {
      this.computedKeys = Object.keys(opt.computed);
      this.computed = {};
      app.computed = app.computed || {}; // eslint-disable-line no-param-reassign
      for (let i = 0, l = this.computedKeys.length; i < l; i++) {
        const key = this.computedKeys[i];
        this.computed[key] = opt.computed[key].bind(app);
        Object.defineProperty(app.computed, key, {
          get: () => this.computed[key](this.state),
        });
      }
    }
    this.state = app.data;
  }

  setState(newState, cb) {
    const state = typeof newState === 'function' ? newState(this.state) : newState;
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
    !this.isRun && (this.isRun = true);
    keys && this.tree.update(keys, value, this.effect);
    typeof cb === 'function' && this.cbs.push(cb);
    this.stack === 0 && this.run();
  }

  run() {
    this.isRun = false;
    const data = this.updateComputed();
    const result = this.tree.getValue();
    this.tree.members = {};
    if (data) {
      const keys = Object.keys(data);
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i];
        result[key] = data[key];
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('setData:', result);
    }
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
    this.state = null;
    this.tree = null;
  }

  updateComputed(first = true) {
    if (!this.computedKeys) return null;
    let data = {};
    first && this.push(); // 保证了computed 内 setSate 不引发新的 run
    for (let i = 0, l = this.computedKeys.length; i < l; i++) {
      const key = this.computedKeys[i];
      const value = this.computed[key](this.state);
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
