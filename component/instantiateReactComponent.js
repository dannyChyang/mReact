import TextComponent from './TextComponent';
import DomComponent from './DomComponent';
import CompositeComponent from './CompositeComponent';

function instantiateReactComponent(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    return new TextComponent(node);
  }

  if(typeof node === 'object' && typeof node.type === 'string'){
    return new DomComponent(node);
  }

  if(typeof node === 'object' && typeof node.type === 'function'){
    return new CompositeComponent(node);
  }
}