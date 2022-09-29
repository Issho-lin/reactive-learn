function createReactive(o) {
    return new Proxy(o, {
        get(target, key, receiver) {
            trace(target, key)
            return Reflect.get(target, key, receiver)
        },
        set(target, key, newVal, receiver) {
            const res = Reflect.set(target, key, newVal, receiver)
            trigger(target, key)
            return res
        }
    })
}

let activeEffect
const bucket = new WeakMap()

function effect(fn) {
    const effectFn = () => {
        cleanup(effectFn)
        activeEffect = effectFn
        fn()
    }
    effectFn.deps = []
    effectFn()
}

function trace(target, key) {
    let depsMap = bucket.get(target)
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
    }
    let deps = depsMap.get(key)
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }
    deps.add(activeEffect)
    activeEffect.deps.push(deps)
}
function trigger(target, key) {
    const depsMap = bucket.get(target)
    if (!depsMap) {
        return
    }
    const deps = depsMap.get(key)
    const depsToRun = new Set(deps)
    depsToRun && depsToRun.forEach(dep => dep())
}
function cleanup(effectFn) {
    for (const dep of effectFn.deps) {
        dep.delete(effectFn)
    }
    effectFn.deps.length = 0
}


const obj = { text: 'foo', ok: true }

const p = createReactive(obj)

effect(() => {
    console.log('effect执行了...');
    document.body.innerText = p.ok ? p.text : 'default'
})

setTimeout(() => {
    p.text = 'bar'
}, 1000);

setTimeout(() => {
    p.ok = false
}, 2000);

setTimeout(() => {
    p.text = 'foo2' // 这一次修改不应该触发effect副作用，因为body.innerText为'default'
}, 3000);