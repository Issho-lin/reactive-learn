function createReactive(o) {
  return new Proxy(o, {
    get(target, key, receiver) {
      trace(target, key);
      return Reflect.get(target, key, receiver);
    },
    set(target, key, newVal, receiver) {
      const res = Reflect.set(target, key, newVal, receiver);
      trigger(target, key);
      return res;
    },
  });
}

let activeEffect;
const bucket = new WeakMap();
const effectStack = [];

function effect(fn, option) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  effectFn.deps = [];
  effectFn.option = option;
  if (!option.lazy) {
    effectFn();
  }
  return effectFn;
}

function trace(target, key) {
  let depsMap = bucket.get(target);
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) {
    return;
  }
  const deps = depsMap.get(key);
  const depsToRun = new Set(deps);
  depsToRun &&
    depsToRun.forEach((dep) => {
      if (dep.option.scheduler) {
        dep.option.scheduler(dep);
      } else {
        dep();
      }
    });
}
function cleanup(effectFn) {
  for (const dep of effectFn.deps) {
    dep.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

const obj = { text: "foo", ok: true };

const p = createReactive(obj);

const effectFn = effect(
  () => {
    document.body.innerText = p.ok ? p.text : "default";
  },
  {
    scheduler(fn) {
      fn();
    },
    lazy: true,
  }
);

setTimeout(() => {
  p.text = "bar";
  console.log('修改了响应数据，但是副作用不会默认执行');
}, 1000);

setTimeout(() => {
    console.log('这里手动执行副作用，才开始建立依赖关系');
    effectFn()
}, 2000);

setTimeout(() => {
    console.log('这里修改就会自动执行副作用了');
    p.text = "baz"
}, 3000);