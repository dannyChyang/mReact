// 所有自定义组件的父类
class Component {
  constructor(props) {
    this.props = props
  }

  setState(newState) {
    this._reactInternalInstance.updateComponent(null, newState)
  }
}
export default Component;