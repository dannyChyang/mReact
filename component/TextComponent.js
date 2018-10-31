import Component from './BaseComponent';

// text类型组件
class TextComponent extends Component {
  mountComponent(rootId) {
    this._rootNodeId = rootId;
    return `<span data-reactid="${rootId}">${this._vDom}</span>`
  }

  updateComponent(newVDom) {
    const nextText = newVDom.toString();
    if(nextText !== this._vDom){
      this._vDom = nextText;
    }

    $(`[data-reactid="${this._rootNodeId}"]`).html(this._vDom)
  }
}
export default TextComponent;