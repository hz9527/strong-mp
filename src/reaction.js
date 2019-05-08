/* eslint-disable no-underscore-dangle */
import Tree from './tree';

export default class Reaction {
  stack = 0

  isRun = false

  state = {}

  tree = new Tree()

  cbs = []

  constructor(app, opt) {
    app.setState = this.setState.bind(this); // eslint-disable-line no-param-reassign
    this.app = app;
    if (opt.computed) {
      this.computedKeys = Object.keys(opt.computed);
      this.computed = {};
      for (let i = 0, l = this.computedKeys.length; i < l; i++) {
        const key = this.computedKeys[i];
        this.computed[key] = app.computed[key].bind(app);
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
    // update tree & state
    keys && this.tree.update(keys, value, this.effect);
    typeof cb === 'function' && this.cbs.push(cb);
    this.stack === 0 && this.run();
  }

  effect = (() => {
    let cur = this.state;
    return (key, value, isArray, isLeaf) => {
      if (!isLeaf) {
        if (!cur[key]) isArray ? (cur[key] = []) : (cur[key] = {});
        cur = cur[key];
      } else {
        cur[key] = value;
        cur = this.state;
      }
    };
  })()

  run() {
    const data = this._updateComputed(false);
    const result = this.tree.getValue();
    if (data) {
      const keys = Object.keys(data);
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i];
        result[key] = data[key];
      }
    }
    this.app.setData(result, this.runCbs);
  }

  runCbs = () => {
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
    this.stack === 0 && this.isRun && this.run();
  }

  updateComputed() {
    this._updateComputed();
  }

  _updateComputed(immediately = true) {
    this.isRun = false;
    if (!this.computedKeys) return null;
    let data = {};
    for (let i = 0, l = this.computedKeys.length; i < l; i++) {
      const key = this.computedKeys[i];
      const value = this.computed[key](this.state);
      value !== this.app.data[key] && (data[key] = value);
    }
    if (this.isRun) {
      data = this._updateComputed(false);
    }
    if (immediately === true) {
      this.app.setData(data, this.runCbs);
    }
    return data;
  }
}
