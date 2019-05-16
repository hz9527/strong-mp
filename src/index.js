import { componentWarpper, pageWarpper } from './warpper';

export default function init(oldPage = Page, oldComponent = Component) {
  function page(options) {
    return oldPage(pageWarpper.resolve(options));
  }
  function component(options) {
    return oldComponent(componentWarpper.resolve(options));
  }
  return { page, component };
}
