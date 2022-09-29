const obj = { foo: 'foo' }

function createReactive(o) {
    return new Proxy(o, {
        get(target, key, receiver) {
            console.log('get', key);
            return Reflect.get(target, key, receiver)
        },
        set(target, key, newVal, receiver) {
            console.log('set', key);
            return Reflect.set(target, key, newVal, receiver)
        }
    })
}

const p = createReactive(obj)

p.foo

setTimeout(() => {
    p.foo = 'bar'
}, 2000);