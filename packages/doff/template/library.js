var libraries = {};
var builtins = [];

var Library = Class('Library', {
    __init__: function() {
        this.filters = {};
        this.tags = {};
    },

    tag: function(name, compile_function){
        if (isfunction(name)){
            this.tags[name.name] = name;
            return name;
        } else if (name != null && isfunction(compile_function)) {
            this.tags[name] = compile_function;
            return compile_function;
        } else
            throw new InvalidTemplateLibrary("Unsupported arguments to Library.tag: (%s, %s)".subs(name, compile_function));
    },

    filter: function(name, filter_func) {
        if (isfunction(name)){
            this.filters[name.name] = name;
            return name;
        } else if (name != null && isfunction(filter_func)) {
            this.filters[name] = filter_func;
            return filter_func;
        } else
            throw new InvalidTemplateLibrary("Unsupported arguments to Library.filter: (%s, %s)".subs(name, filter_func));
        }

});

function get_library(module_name){
    var lib = libraries[module_name];
    if (!lib) {
        var mod = $L(module_name);
        lib = mod.register;
        if (lib)
            libraries[module_name] = lib;
        else
            throw 'TODO MAL';
    }
    return lib;
};

function add_to_builtins(module_name){
    builtins.push(get_library(module_name));
};

$P({ 'Library': Library,
     'add_to_builtins': add_to_builtins,
     'builtins': builtins });