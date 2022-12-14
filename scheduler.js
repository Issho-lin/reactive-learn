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
  effectFn();
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

const obj = { text: "foo", ok: true };

const p = createReactive(obj);

const jobQueue = new Set();
let flush = false;

effect(
  () => {
    // document.body.innerText = p.ok ? p.text : "default";
    console.log(p.text);
  },
  {
    scheduler(fn) {
      //   setTimeout(() => {
      //     console.log('调度器延迟3秒再执行副作用');
      //     fn();
      //   }, 3000);
      jobQueue.add(fn);
      if (flush) {
        return;
      }
      flush = true;
      Promise.resolve()
        .then(() => {
          jobQueue.forEach((job) => job());
        })
        .finally(() => {
          flush = false;
        });
    },
  }
);

// setTimeout(() => {
//   p.text = "bar";
// }, 1000);
p.text = "bar";
p.text = "bar2";
p.text = "bar3";
p.text = "bar4";
