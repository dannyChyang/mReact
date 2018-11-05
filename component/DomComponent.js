import Component from './BaseComponent';
import instantiateReactComponent from './instantiateReactComponent';
import shouldUpdateReactComponent from './shouldUpdateReactComponent';
import $ from 'jQuery';

const UPATE_TYPES = {
  MOVE_EXISTING: 1, // 移动
  REMOVE_NODE: 2, // 删除
  INSERT_MARKUP: 3,  // 插入
};

// 将children转换为Map结构
// 如果child是Text或Dom类型，使用索引值作为MapKey;如果child是Composite类型，使用_vDom上的key作为MapKey
function flattenChildren(childrenComponent) {
  const map = new Map();
  childrenComponent.forEach((child, i) => {
    const childKey = child._vDom && child._vDom.key || i.toString();
    map.set(childKey, child);
  });
  return map;
}

// 生成新的childrenComponent
// 遍历之前的childrenComponent，比对childVDom与nextVDom，如果一致，表示Component没有变动，使用nextVDom更新即可；如果不一致则新建一个Component；
// 返回值结构与flattenChildren()返回值一致
function generateComponentChildren(prevChildren, nextChildrenVDom) {
  const nextChildren = {};
  nextChildrenVDom = nextChildrenVDom || [];
  nextChildrenVDom.forEach((vDom, i) => {
    const name = vDom.key || i.toString();
    const prevChild = prevChildren[name];
    const prevChildVDom = prevChild._vDom;
    if (shouldUpdateReactComponent(prevChildVDom, vDom)) {
      prevChild.updateComponent(vDom);
      nextChildren[name] = prevChild;
    } else {
      const nextChild = instantiateReactComponent(vDom);
      nextChildren[name] = nextChild;
    }
  });
  return nextChildren;
}

//用于将childNode插入到指定位置
function insertChildAt(parentNode, childNode, index) {
  var beforeChild = parentNode.children().get(index);
  beforeChild ? childNode.insertBefore(beforeChild) : childNode.appendTo(parentNode);
}

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
    }

    // 处理children
    children.forEach((item, i) => {
      const childComponent = instantiateReactComponent(item);
      // 记录子组件的索引，更新时需要使用
      childComponent._mountIndex = i;
      childComponent.push(childComponent);

      const childRootId = this._rootNodeId + '.' + i;
      const childMarkup = childComponent.mountComponent(childRootId);
      content.push(childMarkup);
    });

    this._renderedChildrenComponent = childrenComponent;

    return `<${tagOpen.join(' ')}>${content.join('')}<${tagClose}>`;
  }

  updateComponent(nextVDom) {
    const lastProps = this._vDom.props;
    const nextProps = nextVDom.props;
    this._vDom = nextVDom;

    // 处理属性
    this._updateProperties(lastProps, nextProps);

    // 处理children
    this._updateDOMChildren(nextVDom.props.children);
  }

  // 更新html容器上的属性
  _updateProperties(lastProps, nextProps) {
    const jDom = $(`[data-reactid="${this._rootNodeId}"]`);

    const passEventTypes = [];
    Object.keys(lastProps).forEach((prop, i) => {
      if (prop === 'children') {
        return;
      }

      // 对于事件订阅，移除掉nextProps中不存在，及事件监听函数有变化的
      if (/^on([a-zA-Z])/.test(prop)) {
        const eventType = RegExp.$1;
        if (nextProps[prop] !== lastProps[prop]) {
          $(document)
            .undelegate(`[data-reactid=${this._rootNodeId}]`, `${eventType}.${this._rootNodeId}`, lastProps[prop]);
        } else {
          // 如果前后的事件监听函数的引用一致，下面nextProps处理时跳过
          passEventTypes.push(eventType);
        }
        return;
      }

      // 移除nextProps中没有出现的旧有属性
      if (!nextProps.hasOwnProperty(prop)) {
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
  }

  _updateDepth = 0;
  _diffQueue = [];
  _updateDOMChildren(nextChildrenVDoms) {
    this._updateDepth += 1;
    this._diff(this._diffQueue, nextChildrenVDoms);
    this._updateDepth -= 1;

    if (this._updateDepth === 0) {
      this._patch(this._diffQueue);
      this._diffQueue = [];
    }
  }

  // 比对新旧children，提取差异点并存入diffQueue中
  _diff(diffQueue, nextChildrenVDoms) {
    const prevChildren = flattenChildren(this._renderedChildrenComponent);
    const nextChildren = generateComponentChildren(prevChildren, nextChildrenVDoms);

    this._renderedChildrenComponent = Object.values(nextChildren);

    // 排列顺序的游标
    let nextIndexCursor = 0;
    // 用于记录访问旧children中，最后面出现的child的索引，用于优化性能
    let lastIndex = 0;

    // 比对同层级同位置上的节点，排列出新children的顺序
    Object.keys(nextChildren).forEach(key => {
      const prevChild = prevChildren[key];
      const nextChild = nextChildren[key];

      if (prevChild === nextChild) {
        // prevChild === nextChild 表示新的child组件已经存在，只需要处理位置变化
        prevChild._mountIndex < lastIndex && diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: $('[data-reactid=' + this._rootNodeID + ']'),
          type: UPATE_TYPES.MOVE_EXISTING,
          fromIndex: prevChild._mountIndex,
          toIndex: nextIndexCursor,
        });
        lastIndex = Math.max(prevChild._mountIndex, lastIndex);
      } else {
        // prevChild有值，表示key还在使用，但组件的type变了，需要移除掉prevChild
        if (prevChild) {
          diffQueue.push({
            parentId: this._rootNodeId,
            parentNode: $('[data-reactid=' + this._rootNodeID + ']'),
            type: UPATE_TYPES.REMOVE_NODE,
            fromIndex: prevChild._mountIndex,
            toIndex: null,
          });
          //如果以前已经渲染过了，移除掉事件监听，通过命名空间全部清空
          if (prevChild._rootNodeID) {
            $(document).undelegate('.' + prevChild._rootNodeID);
          }
        }

        // 插入新child的html
        diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: $('[data-reactid=' + this._rootNodeID + ']'),
          type: UPATE_TYPES.INSERT_MARKUP,
          fromIndex: null,
          toIndex: nextIndexCursor,
          markup: nextChild.mountComponent(),
        });
      }
      // 更新_mountIndex的值
      nextChild._mountIndex = nextIndexCursor;

      nextIndexCursor += 1;
    });

    // 移除prevChildren中出现而nextChildren中没有出现的的遗留组件
    Object.keys(prevChildren).forEach(key => {
      if (!nextChildren.hasOwnProperty(key)) {
        diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: $('[data-reactid=' + this._rootNodeID + ']'),
          type: UPATE_TYPES.REMOVE_NODE,
          fromIndex: prevChild._mountIndex,
          toIndex: null,
        });
        //如果以前已经渲染过了，移除掉事件监听，通过命名空间全部清空
        if (prevChildren[key]._rootNodeID) {
          $(document).undelegate('.' + prevChildren[key]._rootNodeID);
        }
      }
    });
  }

  // 处理差异diffQueue
  _patch(diffQueue) {
    diffQueue.forEach((diff) => {
      const {type, parentId, parentNode, fromIndex, toIndex, markup} = diff;

      const lastChildJDom = parentNode.children().get(fromIndex);

      switch (type) {
        case UPATE_TYPES.INSERT_MARKUP:
          insertChildAt(parentNode, $(markup),toIndex);
          break;
        case UPATE_TYPES.MOVE_EXISTING:
          lastChildJDom.remove();
          insertChildAt(diff.parentNode, lastChildJDom, toIndex);
          break;
        default:
        case UPATE_TYPES.REMOVE_NODE:
          lastChildJDom.remove();
          break;
      }
    });
  }
}

export default DomComponent;