// import { updateNodeElement } from "../DOM";
import {
  createTaskQueue,
  createStateNode,
  getTag,
  // getRoot
} from "../Misc";

let subTask = null;
const taskQueue = createTaskQueue();
const arrified = arg => (Array.isArray(arg) ? arg : [arg]);

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
      effectsTag: "placement",
      parent: fiber,
      tag: getTag(element),
    };

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
  reconcileChildren(fiber, fiber.props.children);

  // 如果还有子节点，就把子节点当作新的subTask返回，然后会继续执行executeTask（递归构建子级）
  if (fiber.child) return fiber.child;
  console.log('--fiber--', fiber)
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