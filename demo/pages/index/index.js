//index.js
//获取应用实例
const app = getApp()

Page({
  data: {
    list: []
  },
  clickHandler() {
    if (this.data.a) {
      this.setState(getter => {
        const state = getter();
        console.log(state.a.b.c)
        return [['a', 'b', 'c'], 3]
      })
      this.setState(getter => {
        const state = getter();
        console.log(state, state.a.b.c, this.data.a.b.c)
        return [['a', 'b', 'c'], 4]
      })
    } else {
      this.setState({a: {b: {c: 2}}})
      this.setState({x: 1})
      this.setState(getter => {
        console.log(getter())
        return {x: 2}
      })
    }
  }
})
