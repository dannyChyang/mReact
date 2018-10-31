import Component from './BaseComponent';

// text类型组件
class TextComponent extends Component {
  mountComponent(rootId) {
    this._rootNodeId = rootId;
    return `<span data-reactid="${rootId}">${this._vDom}</span>`
  }

  updateComponent() {
  }
}
export default TextComponent;