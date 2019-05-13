import { componentMixin, pageMixin } from './mixin';
import { pageCtrl, componentCtrl } from './ctrl';

export default function init(oldPage = Page, oldComponent = Component) {
  componentMixin.init(componentCtrl);
  pageMixin.init(pageCtrl);
  function page(options) {
    return oldPage(pageMixin.resolve(options));
  }
  function component(options) {
    return oldComponent(componentMixin.resolve(options));
  }
  return { page, component };
}
