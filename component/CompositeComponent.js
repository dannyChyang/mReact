import Component from './BaseComponent';
import instantiateReactComponent from './instantiateReactComponent';

class CompositeComponent extends Component {
  mountComponent(rootId) {
    const { type, props } = this._vDom;

    // 组件实例
    const typeInstance = new type(props);
    this._instance = typeInstance;

    // 在实例上赋加当前类型组件的引用
    typeInstance._internalInstance = this;

    // 这里涉及到组件的生命周期函数调用了
    if (typeInstance.componentWillMount) {
      typeInstance.componentWillMount();
    }

    // 调用render取到组件返回的vDom
    const typeVDom = typeInstance.render();

    // 组件render中返回的vDom对象，交由instantiateReactComponent解析处理
    const renderedComponent = instantiateReactComponent(typeVDom);
    this._renderedComponent = renderedComponent;

    // 取得最终渲染的html
    const renderMarkup = renderedComponent.mountComponent(this._rootNodeId);

    // 这里订阅应用加载完成事件，触发组件的生命周期函数
    // mountReady是应用入口React.render()执行时发布的事件
    $(document).on('mountReady', () => {
      if (typeInstance.componentDidMount) {
        typeInstance.componentDidMount();
      }
    });
    return renderMarkup;
  }

  updateComponent(nextProps, nextState) {

  }
}

export default CompositeComponent;