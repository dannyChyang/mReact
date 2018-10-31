#React源码解析

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
    Composite类型的


