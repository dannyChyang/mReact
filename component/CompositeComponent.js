import Component from './BaseComponent';
import instantiateReactComponent from './instantiateReactComponent';
import shouldUpdateReactComponent from './shouldUpdateReactComponent';
import $ from 'jQuery';

class CompositeComponent {
  constructor(props) {
    this._vDom = vDom;
    this._rootNodeId = null;

    // 组件自身实例
    this._instance = null;

    // render的组件实例
    this._renderedComponent = null;
  }

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

    // 组件render中返回的vDom对象，交由instantiateReactComponent解析处理为组件
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

  updateComponent(newVDom, newState) {
    const nextVDom = newVDom || this._vDom;
    const instance = this._instance;
    const { state } = instance;
    // 构建新的state
    const nextState = {
      ...state,
      newState,
    };
    const { props: nextProps } = nextVDom;

    // shouldComponentUpdate生命周期的返回值可能会中断更新动作
    if (instance.shouldComponentUpdate && instance.shouldComponentUpdate(nextProps, nextState) === false) {
      return;
    }

    // componentWillUpdate生命周期函数的调用
    if (instance.componentWillUpdate) {
      instance.componentWillUpdate(nextProps, nextState);
    }

    instance.state = nextState;
    instance.props = nextProps;

    const prevComponent = this._renderedComponent;

    const prevRenderVDom = prevComponent._vDom;
    const nextRenderVDom = instance.render();

    // 对比上一次render组件的虚拟DOM是否与要更新的DOM一致，
    // 如果一致则执行更新逻辑，否则重新初始化一个新组件
    if (shouldUpdateReactComponent(prevRenderVDom, nextRenderVDom)) {
      // 触发render组件的更新
      prevComponent.updateComponent(nextRenderVDom);
      // 触发组件的componentDidUpdate生命周期
      if (instance.componentDidUpdate) {
        instance.componentDidUpdate();
      }
    }
    else {

      // 构建出新组件
      const nextRenderComponent = instantiateReactComponent(nextRenderVDom);
      // 取得新组件的html
      const nextMarkup = nextRenderComponent.mountComponent(this._rootNodeId);
      // 替换掉页面上原组件的html
      $(`[data-reactid=${this._rootNodeId}]`).replaceWith(nextMarkup);

      // 触发原组件的componentWillUnmount生命周期
      if (prevComponent.componentWillUnmount) {
        prevComponent.componentWillUnmount();
      }
      // 更新_renderedComponent指向新组件
      this._renderedComponent = nextRenderComponent;
    }

  }
}


export default CompositeComponent;