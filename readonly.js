function readonly(obj) {
    return new Proxy(obj, {
        get(target, key, receiver) {
            const res = Reflect.get(target, key, receiver)
            if (typeof res === 'object' && res !== null) {
                return readonly(res)
            }
            return res
        },
        set(_target, key, newVal, _receiver) {
            console.warn(`属性${key}是只读的，不能重新设置为${newVal}`);
            return true
        }
    })
}

const obj = { foo: { bar: 2 } }

const r = readonly(obj)

setTimeout(() => {
    r.foo.bar = 5
}, 1000);

setTimeout(() => {
    r.foo = { bar: 8 }
}, 2000);