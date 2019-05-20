/* eslint-disable prefer-destructuring */
import { pathToArr } from './utils';

export function initComputed(computed, reaction, app) {
  const keys = Object.keys(computed);
  // eslint-disable-next-line no-param-reassign
  app.computed = {};
  for (let i, l = keys.length; i < l; i++) {
    const key = keys[i];
    // deps: [[key], [user, [key]]]
    const { deps, get } = computed[key];
    for (let j = 0, dl = deps.length; j < dl; j++) {
      const list = deps[j];
      let dep;
      let stateManager;
      if (list[0].constructor === reaction.constructor) {
        stateManager = list[0];
        dep = list[1];
      } else {
        dep = list;
        stateManager = reaction.stateManager;
      }
      const watchers = reaction.userMap.get(stateManager) || [];
      const getter = get.bind(app, reaction.getValue);
      for (let k = 0, n = dep.length; k < n; k++) {
        const watcher = stateManager.add(key, getter, (now) => {
          reaction.setState(key, now);
        });
        watchers.push(watcher);
      }
      reaction.userMap.set(stateManager, watchers);
      Object.defineProperty(key, {
        get: getter,
      });
    }
  }
}

export function initWatch(watch, reaction, app) {
  const keys = Object.keys(watch);
  for (let i, l = keys.length; i < l; i++) {
    const key = keys[i];
    const { handler, user } = watch[key];
    const stateManager = user || reaction.stateManager;
    const watchers = reaction.userMap.get(stateManager) || [];
    const source = user || app;
    const paths = pathToArr(key);
    const get = () => {
      let cur = source.data;
      let j = 0;
      const len = paths.length - 1;
      while (j < len) {
        cur = cur[paths[j++]];
      }
      return cur;
    };
    const fn = handler.bind(app);
    const watcher = user.add(key, get, fn);
    watchers.push(watcher);
    reaction.userMap.set(stateManager, watchers);
  }
}

// user add remove from stateManager; data from app
