class Mixin {
  constructor(conf) {
    this.config = conf;
  }

  use(opt) {
    console.log(opt, this);
  }

  resolve(options) {
    console.log(options, this);
  }
}

export const pageMixin = new Mixin({
  hooks: [
    'onReady',
    'onPullDownRefresh',
    'onReachBottom',
    'onShareAppMessage',
    'onPageScroll',
    'onResize',
    'onTabItemTap',
  ],
  entry: 'onLoad',
  show: 'onShow',
  hide: 'onHide',
  destory: 'onUnload',
});

export const componentMixin = new Mixin({
  hooks: [
    'onReady',
    'onPullDownRefresh',
    'onReachBottom',
    'onShareAppMessage',
    'onPageScroll',
    'onResize',
    'onTabItemTap',
  ],
  entry: 'onLoad',
  show: 'onShow',
  hide: 'onHide',
  destory: 'onUnload',
});
