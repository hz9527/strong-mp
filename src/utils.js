
export const noop = () => {};

export function remove(list, item) {
  const ind = list.indexOf(item);
  return ind > -1 ? list.splice(ind, 1) : item;
}

export function pathToArr(str) {
  const preStr = str[0] === '[' ? str : `.${str}`;
  // eslint-disable-next-line no-useless-escape
  const result = preStr.match(/(\[(\d+)\]|\.[^\.\[]+)/g) || [];
  return result.map(item => (item[0] === '[' ? Number(item.slice(1, -1)) : item.replace('.', '')));
}
