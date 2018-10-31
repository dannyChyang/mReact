import VDom from './VDom';

function createElement(type, config, ...children) {
  const props = {};
  config = config || {};

  const { key = null } = config;
  // 将 key 以外的属性由config复制到props对象中
  for (let propName in config) {
    if (config.hasOwnProperty(propName) &&
      propName !== 'key') {
      props[propName] = config[propName];
    }
  }

  if (children.length === 1 && Array.isArray(children[0])) {
    props.children = children[0];
  } else {
    props.children = children;
  }
  return new VDom(type, key, props);
}
