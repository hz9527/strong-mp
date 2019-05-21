import { pageResolver, componentResolver } from './resolve';

export function pageHandler(opt) {
  return pageResolver.resolve(opt);
}

export function componentHander(opt) {
  return componentResolver.resolve(opt);
}
