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

function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key];
    },
    set value(newVal) {
      obj[key] = newVal;
    },
  };
  Object.defineProperty(wrapper, "__ISREF__", { value: true });
  return wrapper;
}

function toRefs(obj) {
  const ret = {};
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      ret[key] = toRef(obj, key);
    }
  }
  return ret;
}

function proxyRefs(obj) {
    return new Proxy(obj, {
        get(target, key, receiver) {
            const res = Reflect.get(target, key, receiver)
            if (res.__ISREF__) {
                return res.value
            }
            return res
        },
        set(target, key, newVal, receiver) {
            const res = target[key]
            if (res.__ISREF__) {
                res.value = newVal
                return true
            }
            return Reflect.set(target, key, newVal, receiver)
        }
    })
}

const obj = { x: 1, y: 2 };
const p = createReactive(obj);
const r = proxyRefs({ ...toRefs(p) });

effect(() => {
  console.log(`[${r.x}, ${r.y}]`);
});

setInterval(() => {
  r.x += 2;
  r.y += 3;
}, 1000);
