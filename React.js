import Component from './Component';
import createElement from './createElement';
import instantiateReactComponent from './component/instantiateReactComponent';
import $ from 'jQuery';

const React = {
  nextReactRootIndex: 0,
  Component,
  createElement,

  render(vDom, container) {
    var componentInstance = instantiateReactComponent(vDom);
    var markup = componentInstance.mountComponent(this.nextReactRootIndex++);

    container.innerHTML = markup;
    $(document).trigger('mountReady');
  },
};