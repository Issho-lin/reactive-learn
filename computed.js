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

const obj = { x: 1, y: 2 };

const p = createReactive(obj);

function computed(getter) {
  let dirty = true; // true代表需要重新计算
  let value;
  let obj;

  const fn = effect(getter, {
    scheduler() {
      dirty = true;
      trigger(obj, "value");
    },
    lazy: true,
  });

  obj = {
    get value() {
      if (dirty) {
        value = fn();
        dirty = false;
      }
      trace(obj, "value");
      return value;
    },
  };
  return obj;
}

const sum = computed(() => p.x + p.y);

console.log(sum.value);
console.log(sum.value);

setTimeout(() => {
  p.x = 4;
  console.log(sum.value);
}, 1000);

setTimeout(() => {
  p.y = 6;
  console.log(sum.value);
}, 2000);

effect(() => {
  document.body.innerText = sum.value;
});
