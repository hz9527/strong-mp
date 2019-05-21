//index.js
import {pageHandler} from '../../libs/index.debug';

Page(pageHandler({
  data: {
    list: []
  },
  computed: {
    test: {
      deps: [['a', 'b', 'c']],
      get(getter) {
        console.log('computed')
        return 123;
      }
    }
  },
  watch: {
    x: {
      handler(now, old) {
        console.log('watch x', now, old)
        this.setState(getter => {
          const state = getter();
          console.log(state.a.b.c)
          return [['a', 'b', 'c'], 3]
        })
      }
    },
    'a.b.c': {
      handler(now, old) {
        console.log(now, old, 'watch a.b.c')
      }
    }
  },
  methods: {
    clickHandler() {
      if (this.data.a) {
        this.setState(getter => {
          const state = getter();
          console.log(state.a.b.c)
          return [['a', 'b', 'c'], 5]
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
  }
}))
