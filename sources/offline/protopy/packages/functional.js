function curry(f) {
    var curried = f, args = array(arguments).slice(1);
    return function() {
        return curried.apply(this, args.concat(array(arguments)));
    }
}

function wrap(f, wrapper) {
    var wraped = f;
    return function() {
      return wrapper.apply(this, [ wraped ].concat(array(arguments)));
    }
}

publish({
    curry: curry,
    wrap: wrap
});