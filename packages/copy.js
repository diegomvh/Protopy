var _copy_dispatch = {};

_copy_dispatch['Array'] = function _copy_array(x) {
    return x.map(function(value) {return value});
}

_copy_dispatch['object'] = function _copy_array(object) {
    return extend({}, object);
}

function copy(x) {
    if (isfunction(x['__copy__']))
        return x.__copy__(x);

    var cls = type(x);

    var copier = _copy_dispatch[cls];
    if (copier)
        return copier(x);

    throw new Exception("copy operation on %s".subs(cls));
}

copy.__doc__ = "Shallow copy operation on arbitrary Protopy objects.";

function _copy_class(x) {
    return x.copy();
}

function _copy_instance(x) {
    return x.copy();
}

function deepcopy(x) {
    if (isfunction(x['__deepcopy__']))
        return x.__deepcopy__(x);
    
    var cls = type(x);

    var copier = _deepcopy_dispatch[cls];
    if (copier)
        return copier(x);

    return copy(x);
}

var _deepcopy_dispatch = {};

_deepcopy_dispatch['Array'] = function _deepcopy_array(x) {
    return x.map(function(value) {return deepcopy(value)});
}

_deepcopy_dispatch['object'] = function _deepcopy_array(object) {
    return extend({}, object);
}

_deepcopy_dispatch['string'] = function _deepcopy_array(object) {
    return object;
}

_deepcopy_dispatch['number'] = function _deepcopy_array(object) {
    return object;
}

$P({ 'copy':copy, 'deepcopy': deepcopy });