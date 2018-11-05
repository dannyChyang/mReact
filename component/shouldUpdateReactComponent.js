// 对比两个虚拟DOM节点是否一致
function shouldUpdateReactComponent(prevVDom, nextVDom) {
  if (prevVDom === null || nextVDom === null) {
    return;
  }

  const prevType = typeof prevVDom;

  // 判断Text或Dom类型组件
  if (prevType === 'string' || prevType === 'number') {
    return typeof nextVDom === prevType;
  } else if (prevType === 'object') {
    // 判断Composite类型组件
    return prevVDom.type === nextVDom.type && prevVDom.key === nextVDom.key;
  }
}

export default shouldUpdateReactComponent;