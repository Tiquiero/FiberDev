// import { updateNodeElement } from "../DOM";
import {
  createTaskQueue,
  createStateNode,
  getTag,
  // getRoot
} from "../Misc";

let subTask = null;
let pendingCommit = null;
const taskQueue = createTaskQueue();
const arrified = arg => (Array.isArray(arg) ? arg : [arg]);

const commitAllWork = fiber => {
  fiber.effects.forEach(i => {
    const { effectTag, parent, stateNode, tag } = i;
    if (effectTag === 'placement') {
      let parentFiber = parent;
      
      while (parentFiber.tag === 'class_component') {
        // 如果父节点还是类组件，就一直往上找到，直到不是类组件的父级（普通节点）
        // 类组件节点不能直接追加（appendChild）dom元素
        parentFiber = parentFiber.parent;
      }
      if (tag === 'host_component') {
        parentFiber.stateNode.appendChild(stateNode);
      }
    }
  });
}

const reconcileChildren = (fiber, children) => {
  /**
   * children 可能是object，也可能是array
   */
  const arrifiedChildren = arrified(children); 
  let idx = 0;
  let numberOfElements = arrifiedChildren.length;
  let newFiber = null;  // 子级 fiber 对象
  let prevFiber = null;  // 上一个兄弟 fiber 对象
  let element = null;

  while (idx < numberOfElements) {
    element = arrifiedChildren[idx];
    newFiber = {
      type: element.type,
      props: element.props,
      effects: [],
      effectTag: "placement",
      parent: fiber,
      tag: getTag(element),
    };

    // 为fiber对象添加DOM对象或者是类组件的实例对象
    newFiber.stateNode = createStateNode(newFiber);

    if (idx === 0) {
      // 如果是第一个子节点，设置fiber的子级为该节点
      fiber.child = newFiber;
    } else {
      // 如果不是第一个子节点，则设置为第一个子节点的兄弟节点
      prevFiber.sibling = newFiber;
    }
    prevFiber = newFiber;
    idx++;
  }
}

/**
 * 
 * @param {*} fiber 
 * 该方法就是构造出子级fiber对象
 */
const executeTask = (fiber) => {
  if (fiber.tag === 'class_component') {
    // 如果是类组件，那就返回stateNode的render方法，render后才是dom节点
    reconcileChildren(fiber, fiber.stateNode.render());
  } else {
    reconcileChildren(fiber, fiber.props.children);
  }

  // // 如果还有子节点，就把子节点当作新的subTask返回，然后会继续执行executeTask（递归构建子级）
  if (fiber.child) return fiber.child;

  let curExecutelyFiber = fiber;

  while (curExecutelyFiber.parent) {

    // fiber对象都存储在各自effect数组中，父级存放的是子级的fiber对象合集
    // 所以最终最外层的effect存储的是所有的fiber对象数组
    curExecutelyFiber.parent.effects = curExecutelyFiber.parent.effects.concat(
      curExecutelyFiber.effects.concat([curExecutelyFiber])
    )

    // 如果这个节点或者子节点 有同级，就返回他的同级
    if (curExecutelyFiber.sibling) return curExecutelyFiber.sibling;

    // 没有同级就往上，返回父级再同理递归查找，最终会往上到根节点
    curExecutelyFiber = curExecutelyFiber.parent;
  }
  pendingCommit = curExecutelyFiber;
}

/**
 * 拿取任务后构造最外层的fiber对象返回出去
 */
const getFirstTask = () => {
  const task = taskQueue.pop();
  return {
    props: task.props,
    tag: 'host_root',
    stateNode: task.dom,
    effects: [],
    child: null
  }
} 

const workLoop = (deadline) => {
  if (!subTask) {
    subTask = getFirstTask(); // 如果没有任务，就去拿任务
  }

  console.log('--subTask-', subTask)

  while (subTask && deadline.timeRemaining() > 1) {
    /**
     * 浏览器空余时间大于1ms
     * executeTask 方法去执行任务 接受一个任务 返回新的任务
     */
    subTask = executeTask(subTask);
  }

  if (pendingCommit) commitAllWork(pendingCommit);
}

const performTask = (deadline) => {
  workLoop(deadline);

  /**
   * 判断任务是否存在或者队列里是不是还有任务
   */
  if (subTask || !taskQueue.isEmpty()) requestIdleCallback(performTask);
}

export const render = (element, dom) => {
  /**
   * 任务要做的就是通过 vdom 对象 构建 fiber 对象
   */

  /**
   * 1. 先向任务队列添加任务
   * 2. 然后指定浏览器在空闲的时候去执行
   */

   taskQueue.push({
     dom,
     props: { children: element }
   });

   requestIdleCallback(performTask);
}