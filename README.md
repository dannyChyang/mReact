# React源码解析

### 虚拟DOM(Virtual DOM)
了解React的都知道，其高效的原因，是因为React按照页面的DOM结构，
利用Javascript在内存中构建了一套相同结构的虚拟内存树模型，这个内存模型就称为Virtual DOM。
每当页面产生了变化，React的diff算法会先在内存模型中进行比对，提取出差异点，
在将Virtual DOM转化为原生DOM输出时，按照差异点，只patch出有变动的部分

下面是VirtualDOM节点的定义
```javascript
function VDom(type, key, props) {
  this.type = type;
  this.key = key;
  this.props = props;
}
```

### 入口
一切都是从`React.render(<App/>, document.body)`开始的，所以先看React的定义

其包括
- render(virtualDom, container) 
  命令式调用，一般用于应用入口，将虚拟DOM渲染在container容器中
- createElement(name, props, children)
  创建组件时使用，JSX是其语法糖
- Component
  以ES6中的类式语法声明时使用

### createElement(type, props, children)

createElement()的主要作用是根据给定type创建Virtual DOM节点，JSX是它的语法糖形式；
其type参数可以是原生的html标签名（如：div、tag等），也可以是React组件类或函数

---
### 组件的实现

React的所有组件，按照类型可以分为三种：
- 文本展示类型 (TextComponent)
- 原生DOM类型 (DomComponent)
- 自定义类型 (CompositeComponent)

每种类型的组件，都需要处理**初始化**和**更新**两种逻辑，对应下面声明的两个函数
- `mountComponent(rootNodeId)` 处理初始化逻辑
- `updateComponent()` 处理更新逻辑

#### 初始化mountComponent()的实现
下面从初始化开始，实现不同类型组件的初始化渲染逻辑
    
> `mountComponent()`的实现思路是，根据其vDom对象生成html代码并返回。下面是各个组件实现的`mountComponent()`逻辑


首先定义类型组件的基类`Component`，它只是简单地定义了传入的VDom实例，并初始化了组件ID
```javascript
class Component{
  constructor(vDom){
    this._vDom = vDom;
    this._rootNodeId = null;
  }
}
```

- TextComponent

    Text组件类作为纯展示类型，只需要将要展示的内容包装放入标签并返回就可以了
                 
```javascript
mountComponent(rootId){
     this._rootNodeId = rootId;
     return `<span data-reactid="${rootId}">${this._vDom}</span>`
}
```
 
- DomComponent
    DOM类型在处理原生DOM时，需要注意`原生事件`的处理
 ```javascript
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
}
```

- CompositeComponent
    实现Composite类型的渲染逻辑之前，先看一下React组件的定义语法
```javascript
import React from 'react'

class App extends React.Component {
  render() {
    return (
    )
  }
}
```
App继承自React.Component，所以我们首先来实现`Component`这个类
> 注意这里的`React.Component`不要与上面的`Component`混淆，
前者作为组件的基类，用于定义自定义组件类型，
而后者是逻辑基类，用于处理前者的渲染逻辑；


在React.Component中，声明了所有组件都会使用到的`props`属性，以及用于触发更新的`setState()`函数

```javascript
class Component {
  constructor(props) {
    this.props = props
  }

  setState(newState) {
    this._reactInternalInstance.updateComponent(null, newState)
  }
}
```
了解React.Component的定义之后，我们回到CompositeComponent的mountComponent()实现上来，

首先要了解的是，在composite类型组件中，vDom对象中的type属性，就是组件类的定义引用，
因此在mountComponent()函数要做的工作，**就是使用vDom的props属性来创建一个type的实例**
```javascript
class CompositeComponent extends Component {
  mountComponent(rootId) {
    const { type, props } = this._vDom;

    // 组件实例
    const typeInstance = new type(props);
    this._instance = typeInstance;

    // 在实例上赋加当前类型组件的引用
    typeInstance._reactInternalInstance = this;

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
}
```

> 思考一下，在JSX语法中，解释器碰到<MyInput/>标签后，就会去查找MyInput的定义，
然后调用React.createElement(MyInput)，此时形参type接收到的是MyInput这个类或方法，
因此在mountComponent()中可以使用new type()构造出MyInput的实例

---

#### 更新updateComponent()的实现
实现完组件的**初始化**之后，接下来要实现组件的更新逻辑

React开放了setState()用于组件更新，回顾上面`React.Component`中`setState()`的定义， 
实际上是调用了`this._reactInternalInstance.updateComponent(null, newState)`函数，
组件实例this上的_reactInternalInstance属性，是Composite类型组件mountComponent()阶段定义的，
因此更新逻辑由CompositeComponent的updateComponent()函数中进行

- CompositeComponent

    Composite类型组件的更新函数，需要处理两种流程，
    - 当被定义在其它组件的`render`函数中时，其包裹组件会构建出新的vDom对象，根据传入新的vDom来处理更新；
    - 当组件内部使用`setState()`触发时，根据新的state来更新；
    
    了解这两种方式的区别，可以帮助我们理解下面`updateComponent`函数的实现。
    
    ```javascript
    class CompositeComponent extends Component {
      constructor(props) {
        super(props);
        // 组件自身实例
        this._instance = null;
        // render的组件实例
        this._renderedComponent = null;
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
    
          // 重新构建render组件
          const nextRenderComponent = instantiateReactComponent(nextRenderVDom);
          // 生成新render组件的html
          const nextMarkup = nextRenderComponent.mountComponent(this._rootNodeId);
          // 替换掉页面内容
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
    ```
    
    我们梳理一下更新流程：
    * 组件在初始化时，记录下了展示的组件实例，即`this._renderedComponent`；
    * 在更新环节，重新render()得到新的VDom`nextRenderVDom`；
    * 通过比对前后两个VDom的type和key，来判断是触发原来的`_renderedComponent`的`updateComponent`函数，或是重新生成新的组件
    
    上面使用到了`shouldUpdateReactComponent`这个比对函数，来对vDom的type和key进行比对
    ```javascript
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
    ```
    上面这个处理逻辑，就是React实现的diff算法的第一个规则：
    当两个VDom节点的类型不一致时，重新构建该组件的Virtual DOM树结构

- TextComponent
    Text类型组件作为颗粒度最小的组件，更新逻辑非常简单，展示新的文本内容即可
    ```javascript
      class TextComponent extends Component {
        updateComponent(newVDom) {
          const nextText = newVDom.toString();
          if(nextText !== this._vDom){
            this._vDom = nextText;
          }
      
          $(`[data-reactid="${this._rootNodeId}"]`).html(this._vDom)
        }
      }
      export default TextComponent;
    ```
- DomComponent
    在更新阶段，相对复杂的是Dom类型，diff算法也是在这里发挥效用，提升了React的渲染效率
    
    