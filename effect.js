const obj = { foo: 'foo' }

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
        activeEffect = effectFn
        fn()
    }
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
}
function trigger(target, key) {
    const depsMap = bucket.get(target)
    if (!depsMap) {
        return
    }
    const deps = depsMap.get(key)
    deps && deps.forEach(dep => dep())
}

const p = createReactive(obj)

effect(() => {
    document.body.innerText = p.foo
})

setTimeout(() => {
    p.foo = 'bar'
}, 2000);