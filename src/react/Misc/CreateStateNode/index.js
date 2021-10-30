import { createDOMElement } from "../../DOM";

const createStateNode = (fiber) => {
  const { tag, props, type } = fiber;

  if (tag === 'host_component') {
    return createDOMElement(fiber);
  } else if (tag === 'class_component') {
    // 如果是类组件，就直接返回他的构造函数(type)
    return new type(props);
  } 
  return type;
}

export default createStateNode;
