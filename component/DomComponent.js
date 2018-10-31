import Component from './BaseComponent';
import instantiateReactComponent from './instantiateReactComponent';
import $ from 'jQuery';

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

  updateComponent(nextVDom) {
    const lastProps = this._vDom.props;
    const nextProps = nextVDom.props;
    const children = nextProps.children;

    this._vDom = nextVDom;
    const jDom = $(`[data-reactid="${this._rootNodeId}"]`);
    const passEventTypes = [];
    // 处理属性及事件
    Object.keys(lastProps).forEach((prop, i) => {
      if (prop === 'children') {
        return;
      }
      if (/^on([a-zA-Z])/.test(prop)) {
        const eventType = RegExp.$1;
        // 移除不需要的事件
        if (nextProps[prop] !== lastProps[prop]) {
          $(document).undelegate(`[data-reactid=${this._rootNodeId}]`, eventType, lastProps[prop]);
        } else {
          passEventTypes.push(eventType);
        }
      }
      // 删掉新props中没有而旧props中存在的属性
      else if (lastProps[prop] && !nextProps[prop]) {
        jDom.remoteAttr(prop);
      }
    });
    Object.keys(nextProps).forEach((prop, i) => {
      if (prop === 'children') {
        return;
      }
      if (/^on([a-zA-Z])/.test(prop)) {
        const eventType = RegExp.$1;
        // 为没有添加过的事件添加订阅
        if (!passEventTypes.includes(eventType)) {
          $(document)
            .delegate(`[data-reactid=${this._rootNodeId}]`, `${eventType}.${this._rootNodeId}`, nextProps[prop]);
        }
      } else {
        // 更新属性
        jDom.attr(prop, nextProps[prop]);
      }
    });

    // 处理children
    this._updateDOMChildren(nextVDom.props.children)
  }

  _updateDOMChildren(children){

  }
}

export default DomComponent;