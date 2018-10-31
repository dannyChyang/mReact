import Component from './BaseComponent';
import instantiateReactComponent from './instantiateReactComponent';

// html Dom 类型组件
class DomComponent extends Component {
  constructor(props) {
    super(props);
    this._renderedChildrenComponent = null;
  }

  mountComponent(rootId) {
    this._rootNodeId = rootId;
    const { type, props, props: { children } } = this._vDom;
    const childrenComponent = [];

    let tagOpen = [type, `data-reactid=${this._rootNodeId}`],
      tagClose = `/${type}`,
      content = [];

    // 处理vDom上的props
    for (let prop in props) {
      // 处理事件
      if (/^on[a-zA-Z]/.test(prop)) {
        const eventType = prop.replace('on', '');
        $(document).delegate(`[data-reactid=${this._rootNodeId}]`, `${eventType}.${this._rootNodeId}`, props[propKey]);
      }

      // 处理一般属性
      if (props[prop] && prop !== 'children' && !(/^on[a-zA-Z]/.test(prop))) {
        tagOpen.push(`${prop}=${props[prop]}`);
      }

      // 处理children
      children.forEach((item, i) => {
        const childComponent = instantiateReactComponent(item);
        childComponent._mountIndex = i;
        childComponent.push(childComponent);

        const childRootId = this._rootNodeId + '.' + i;
        const childMarkup = childComponent.mountComponent(childRootId);
        content.push(childMarkup);
      });
      this._renderedChildrenComponent = childrenComponent;
    }

    return `<${tagOpen.join(' ')}>${content.join('')}<${tagClose}>`;
  }

  updateComponent() {
  }
}

export default DomComponent;