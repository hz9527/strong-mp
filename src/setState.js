function onload(fn, stack) {
  let state = {}
  return function(...args) {
    this.setState = function(newState) {
      if (stack) {
        state = mergeState(state, newState)
      } else {
        this.setData()
      }
    }
    return fn(...args)
  }
}

function mergeState(state, newState) {
  return {...state, ...newState}
}

function incrementFactory() {
  const cache = {}
  return function (state, data) {
    
  }
}

function decoratorPage(page) {
  let stack = 0;
  return function(options) {
    const opt = Object.keys(options).reduce((res, key) => {
      if (typeof options[key] === 'function') {
        const old = opt[key];
        opt[key] = function(...args) {
          stack++;
          const result = old(...args)
          stack--;
          stack === 0 && this.setState()
          return result;
        }
      }
    }, {})
    return page(opt)
  }
}