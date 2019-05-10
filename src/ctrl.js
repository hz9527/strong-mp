import Reaction from './reaction';
import { pageMixin, componentMixin } from './mixin';

class Ctrl {
  map = {}

  entry(app, opt, id) {
    this.map[id] = new Reaction(app, opt);
  }

  detroy(id) {
    if (this.map[id]) {
      delete this.map[id];
    }
  }

  show(id) {}

  hide(id) {}
}

const ctrl = new Ctrl();

pageMixin.use({
  onLoad() {
    ctrl.add(this, this, this.id);
  },
});

componentMixin.use({

});
