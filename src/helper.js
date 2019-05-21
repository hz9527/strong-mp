/* eslint-disable prefer-destructuring */
import { pathToArr } from './utils';
import { Watcher } from './watcher/watcher';

export class User {
  constructor(reaction) {
    const { stateManager, deps } = reaction;
    this.add = stateManager.add.bind(stateManager);
    this.remove = stateManager.remove.bind(stateManager);
    this.deps = deps;
  }
}

export function initComputed(computed, reaction, app) {
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

export function initWatch(watch, reaction, app) {
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
