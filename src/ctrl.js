import Reaction from './reaction';

const Key = '__id__';
const WebviewId = '__webviewId__';
class Ctrl {
  entry(id, app, opt) {
    this.map = {};
    Object.defineProperty(app, Key, {
      value: id,
      writable: false,
    });
    this.map[id] = new Reaction(app, opt);
  }

  detroy(id) {
    if (this.map[id]) {
      delete this.map[id];
    }
  }

  show(id) {}

  hide(id) {}

  push(app) {
    const reaction = this.map[app[Key]];
    reaction && reaction.push();
  }

  pop(app) {
    const reaction = this.map[app[Key]];
    reaction && reaction.pop();
  }

  init(app, hook) {
    this[hook](app[WebviewId], app, app);
  }

  run(app, hook) {
    this[hook](app[Key]);
  }
}

export const ComponentId = '__componentId__';
class ComponentCtrl extends Ctrl {
  constructor() {
    super();
    this.options = {};
  }

  addOptions(options) {
    const { data: { [ComponentId]: id } } = options;
    this.options[id] = options;
  }

  init(app, hook) {
    const { data: { [ComponentId]: id } } = app;
    this[hook](id, app, this.options[id] || {});
  }
}
export const pageCtrl = new Ctrl();

export const componentCtrl = new ComponentCtrl();
