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
    const res = fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  };
  effectFn.deps = [];
  effectFn.option = option;
  if (!option?.lazy) {
    effectFn();
  }
  return effectFn;
}

function trace(target, key) {
  if (!activeEffect) return;
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
      if (dep.option?.scheduler) {
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

// 读取代理对象所有属性，触发收集依赖
function traverse(o, seen = new Set()) {
  if (typeof o !== "object" || o === null || seen.has(o)) {
    return;
  }
  seen.add(o);
  for (const key in o) {
    if (Object.hasOwnProperty.call(o, key)) {
      traverse(o[key], seen);
    }
  }
  return o;
}

function watch(obj, cb, option) {
  const getter = typeof obj === "function" ? obj : () => traverse(obj);
  let newVal, oldVal, cleanup;

  function onInvalidate(fn) {
    cleanup = fn;
  }

  const job = () => {
    newVal = effectFn();
    if (cleanup) {
      cleanup(); // cb函数执行之前。cleanup存储的是上一次副作用中定义的过期函数
    }
    cb(newVal, oldVal, onInvalidate);
    oldVal = newVal;
  };

  const effectFn = effect(getter, {
    scheduler() {
      if (option?.flush === "post") {
        Promise.resolve().then(() => {
          job();
        });
      } else {
        job();
      }
    },
    lazy: true,
  });
  if (option?.immediate) {
    job();
  } else {
    oldVal = effectFn();
  }
}

function ref(value) {
  const wrapper = { value };
  return createReactive(wrapper);
}

const p = ref(1);

effect(() => {
  console.log('ref.value:', p.value);
});

setTimeout(() => {
  p.value = 5;
}, 1000);
