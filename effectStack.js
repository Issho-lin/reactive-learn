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

function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  effectFn.deps = [];
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
  depsToRun && depsToRun.forEach((dep) => dep());
}
function cleanup(effectFn) {
  for (const dep of effectFn.deps) {
    dep.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

const obj = { text: "foo", ok: true };

const p = createReactive(obj);

// 每次修改effct1跟effect2都应该执行
effect(() => {
  console.log("effect1执行了...");
  effect(() => {
    console.log("effect2执行了...", p.text);
    // document.body.innerText = p.ok ? p.text : "default";
  });
  p.ok;
  //   console.log('effect1读取属性的操作在effect2之后', );
});

// setTimeout(() => {
//   p.text = "bar";
// }, 1000);

// setTimeout(() => {
//   p.ok = false;
// }, 2000);
p.ok = false;

// setTimeout(() => {
//   p.text = "foo2"; // 这一次修改不应该触发effect副作用，因为body.innerText为'default'
// }, 3000);
