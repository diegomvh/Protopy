(function(){

    //--------------------------------------- Class definition --------------------------------------//
    
    function __class__() {
        var name = null, 
            module = this['__name__'],
            metaclass = {},
            static = {},
            proto = {},
            parent = null,
            properties = array(arguments);

        // Name
        if (isstring(properties[0]))
            name = properties.shift();
        else name = 'Class';
        
        //Paren
        if (isfunction(properties[0]))
            parent = properties.shift();
        
        //Methods
        if (properties.length >= 3) throw new TypeError('Invalid arguments');
        if (properties.length == 2) {
            static = properties.shift();
            proto = properties.shift();
        } else if (properties.length == 1) {
            proto = properties.shift();
        }

        //Metaclass
        if (parent && parent['__metaclass__'] && proto['__metaclass__'])
            metaclass = __extend__(true, parent['__metaclass__'], proto['__metaclass__']);
        else if (parent)
            metaclass = parent['__metaclass__'] || proto['__metaclass__'] || null;
        else
            metaclass = proto['__metaclass__'] || null;

        //I'm ready for build de class
        var Class = function Class() { this.__init__.apply(this, arguments); };

        Class.superclass = parent;
        Class.subclasses = [];

        if (parent) {
            var subclass = function() { };
            subclass.prototype = parent.prototype;
            Class.prototype = new subclass;
            parent.subclasses.push(Class);
            delete Class.prototype.__iterator__;
        }

        if (metaclass) {
            __extend__(true, Class, metaclass);
            Class['__metaclass__'] = metaclass;
        }
        
        var data = {'__name__': name, '__module__': module};
        data['__doc__'] = static['__doc__'] || proto['__doc__'];
        __extend__(true, Class, __class__.methods, static, data);
        __extend__(true, proto, data);
        
        if (isfunction(Class.__new__))
            Class = Class.__new__(name, parent, proto);
        else
            Class.add_methods(proto);

        // init method
        if (!Class.prototype.__init__)
            Class.prototype.__init__ = Protopy.emptyfunction;

        // str method
        if (Class.prototype.__str__) {
            Class.prototype.toString = Class.prototype.__str__;
        }
        
        // iterator method
        if (Class.prototype.__iter__) {
            Class.prototype.__iterator__ = Class.prototype.__iter__;
        }
        
        Class.prototype.constructor = Class;
        Class.prototype.__class__ = Class;

        return Class;
    }
    
    __class__.methods = {
        add_methods: function(source) {
            var properties = keys(source);

            if (!keys({ toString: true }).length)
                properties.push("toString", "valueOf");

            for (var i = 0, length = properties.length; i < length; i++) {
                var property = properties[i], value = source[property];
                this.add_method(property, value);
            }
        },

        add_method: function(property, value) {
            var ancestor = this.superclass && this.superclass.prototype;
            if (ancestor && isfunction(value) && value.argument_names()[0] == "$super") {
                var method = value;
                var value = (function(m) {
                    return function() { return ancestor[m].apply(this, arguments) };
                })(property).wrap(method);

                value.valueOf = method.valueOf.bind(method);
                value.toString = method.toString.bind(method);
            }
            this.prototype[property] = value;
        }
    }
    //-----------------------------------------------------------------------------------------------//

    function __extend__(safe, destiny) {
        for (var i = 2, length = arguments.length; i < length; i++) {
            var obj = arguments[i];
            for (var prop in arguments[i]) {
                if (safe || prop.search(/^__.*__$/) == -1 /*&& prop.search(/^\$.*$/) == -1*/)
                    destiny[prop] = obj[prop];
            }
        }
        return destiny;
    }

    // a este lo manejo yo! y el load :)
    var __modules__ = {}
    var __path__ = {'':'/packages/'}

    //la funcion que hace el load
    function __load__(name) {
        // if this == window then load for de module __main__ and for de envoirement
        var win = true; //(this == window);
        var names = name.split('.'),
            mod = __modules__[name],
            path = null;

        if (!mod) {
            var base = isundefined(__path__[names[0]]) ? __path__[''] : __path__[names.shift()],
                file = base + names.join("/") + '.js',
                code = null;
                if (names[0])
            new Ajax.Request(file, {
                asynchronous : false,
                evalJS: false,
                onSuccess: function(transport) {
                    code = '(function(){ ' + transport.responseText + '});';
                },
                onException: function (obj, exception){
                    throw exception;
                },
                onFailure: function(){
                    file = base + names.join("/") + "/__init__.js";
                    new Ajax.Request(file, {
                        asynchronous : false,
                        evalJS: false,
                        onSuccess: function(transport) {
                            code = '(function(){' + transport.responseText + '});';
                            path = base + names.join("/");
                        },
                        onException: function (obj, exception){
                            throw exception;
                        },
                        onFailure: function(){
                            throw new LoadError();
                        }
                    });
                }
            });
            if (code) {
                mod = new module(name, file);
                __modules__[name] = mod;
                if (path) { 
                    mod['__path__'] = path;
                    mod['__path__']['__builtins__'] = path; 
                }
                try {
                    with (mod['__builtins__']) {
                        eval(code).call(mod);
                    }
                } catch (except) {
                    delete __modules__[name];
                    throw except;
                }
                // Muejejejeje
                delete mod['__builtins__'];
            } else {
                throw new LoadError();
            }
        }
        switch (arguments.length) {
            case 1:
                    // Returns module
                    var last = names[names.length - 1];
                    if (win) this[last] = mod;
                    __modules__[this['__name__']][last] = mod;
                    return mod;
            
            case 2:
                    // If all contents were requested returns nothing
                    if (arguments[1] == '*') {
                        if (win) extend(this, mod);
                        extend(__modules__[this['__name__']], mod);
                        return;

                    // second arguments is the symbol in the package
                    } else {
                        var n = arguments[1];
                        if (win) this[n] = mod[n];
                        __modules__[this['__name__']][n] = mod[n];
                        return mod[n];
                    }
                    

            default:
                    // every argyment but the first one are a symbol
                    // returns nothing
                    for (var i = 1, length = arguments.length; i < length; i++) {
                        if (win) this[arguments[i]] = mod[arguments[i]];
                        __modules__[this['__name__']][arguments[i]] = mod[arguments[i]];
                    }
                    return;
        }
    }

    // La funcion que publica es como el __all__
    function __publish__(object) {
        for (var k in object) {
            __modules__[this['__name__']][k] = object[k];
        }
    }

    // add to builtins
    function __builtins__(object) {
        //TODO: validate
        __extend__(false, __modules__['__main__']['__builtins__'], object);
        __extend__(false, window, object);
    }
    
    function __doc__(doc) {
        __modules__[this['__name__']]['__doc__'] = doc;
    }

    //el concpeto de modulo
    function module(name, file, source) {
        this['__file__'] = file;
        this['__name__'] = name;
        if (file == 'built-in') {
            if (source && source instanceof Object)
                __extend__(true, this, source);
        } else {
            // Only for non builtins modules
            this['__builtins__'] = {};
            extend(this['__builtins__'], __modules__['__main__']['__builtins__']);
            this['__builtins__']['__file__'] = file;
            this['__builtins__']['__name__'] = name;
        }
    }

    // Global name system
    function id(value) {
        if (isnumber(value) || isstring(value))
            { return value; }
        else if (isarray(value))
            { return value.reduce(function(x, y) {return "" + id(x) + id(y)})}
        else if (isundefined(value['__hash__'])) {
            value['__hash__'] = id.next();
        }
        return value['__hash__'];
    };
    
    id.current = 0;
    id.next = function () { return id.current += 1; };
    id.__doc__ = "I'm sorry";

    //__main__ module
    __modules__['__main__'] = new module('__main__','built-in', {'__builtins__': {
        '__name__': '__main__',
        '__doc__': "Welcome to protopy"
        }, '__doc__': "Welcome to protopy" });
    __extend__(true, window, __modules__['__main__']);

    __modules__['__builtin__'] = new module('__builtin__','built-in', {
        '$P': __publish__,
        '$L': __load__,
        '$B': __builtins__,
        '$D': __doc__,
        '$w': function $w(string) {
            if (!isstring(string)) return [];
            string = string.strip();
            return string ? string.split(/\s+/) : [];
        },
        'extend': function extend() {return __extend__.apply(this, [false].concat(array(arguments)));},
        'abs': function(){ throw new NotImplementedError();},
        'all': function all(){ throw new NotImplementedError();},
        'any': function any(){ throw new NotImplementedError();},
        'apply': function(){ throw new NotImplementedError();},
        'assert': function assert( test, text ) {
            if ( test === false )
                throw new AssertionError( text );
            return test;
        },
        'basestring': function(){ throw new NotImplementedError();},
        'bool': function bool(object) {
            if (object == null) return false;
            switch (typeof(object)) {
                case 'undefined': return false;
                case 'string': return object != '';
                case 'boolean': return object != false;
                case 'number': return object != 0;
                default: {
                        if (isfunction(object['__nonzero__'])) {
                            return object.__nonzero__();
                        } else if (isarray(object)) {
                            return object.length != 0;
                        } else {
                            return keys(object).length != 0;
                        }
                }
            }
            throw new TypeError("object of type '" + typeof(object) + "' has no bool()");
        },
        'buffer': function(){ throw new NotImplementedError();},
        'callable': function(){ throw new NotImplementedError();},
        'chr': function chr(number){ 
            if (!isnumber(number)) throw new TypeError('An integer is required');
            return String.fromCharCode(number); },
        'classmethod': function(){ throw new NotImplementedError();},
        'Class': __class__,
        'cmp': function(){ throw new NotImplementedError();},
        'coerce': function(){ throw new NotImplementedError();},
        'compile': function(){ throw new NotImplementedError();},
        'complex': function(){ throw new NotImplementedError();},
        'copyright': function(){ throw new NotImplementedError();},
        'credits': function(){ throw new NotImplementedError();},
        'bisect': function bisect(array, element) {
            var i = 0;
            for (var length = array.length; i < length; i++)
                if (array[i].__cmp__(element) > 0) return i;
            return i;
        },
        'delattr': function(){ throw new NotImplementedError();},
        'dict': function dict(object){ return new Dict(object) },
        //no se porque no anda el dir
        'ls': function ls(obj){ return keys(__modules__[(obj && obj['__name__']) || this['__name__']]); },
        'divmod': function(){ throw new NotImplementedError();},
        'execfile': function(){ throw new NotImplementedError();},
        'equal': function(object1, object2){
            if (isfunction(object1['__eq__'])) return object1.__eq__(object2);
            return object1 == object2;
        },
        'nequal': function(object1, object2){
            if (isfunction(object1['__ne__'])) return object1.__ne__(object2);
            return object1 != object2;
        },
        'file': function(){ throw new NotImplementedError();},
        'filter': function filter(func, sequence){ 

        },
        'float': function float(value) {
            if (!isstring(value) || isnumber(value)) throw new TypeError('Argument must be a string or a number');
            var number = Number(value);
            if (isNaN(number))
                throw new ValueError('Invalid literal');
            return number;
        },
        'frozenset': function(){ throw new NotImplementedError();},
        'flatten': function flatten(array) { 
            return array.reduce(function(a,b) { return a.concat(b); }, []); 
        },
        'getattr': function(){ throw new NotImplementedError();},
        'globals': function globals(){ return __modules__['__main__']; },
        'hasattr': function(){ throw new NotImplementedError();},
        'hash': function(){ throw new NotImplementedError();},
        'help': function help(module){ 
            if (isundefined(module)) 
                print(__modules__[this['__name__']]['__doc__']);
            print(module['__doc__']);
         },
        'hex': function(){ throw new NotImplementedError();},
        'id': id,
        'input': function(){ throw new NotImplementedError();},
        'include': function include(object, element){
            if (isundefined(object)) return false;
            if (isfunction(object['__contains__'])) return object.__contains__(element);
            return object.indexOf(element) > -1;
        },
        'int': function int(value) {
            if (!isstring(value) || isnumber(value)) throw new TypeError('Argument must be a string or a number');
            var number = Math.floor(value);
            if (isNaN(number))
                throw new ValueError('Invalid literal');
            return number;
        },
        'intern': function(){ throw new NotImplementedError();},
        'isclass': function isclass(object) { return bool(object) && isfunction(object) && 'superclass' in object && 'subclasses' in object; },
        'isinstance': function isinstance(object){
            //TODO hacerlo com oen python para que soporte arrgelos y pueda determinas si es instancia de una clase en particular
            return isfunction(object.__class__) && object instanceof object.__class__;
        },
        'isfunction': function isFunction(object) { return typeof object == "function"; },
        'isstring': function(object) { return typeof object == "string"; },
        'isnumber': function(object) { return typeof object == "number"; },
        'isundefined': function(object) { return typeof object == "undefined"; },
        'isarray': function(object) { return object != null && typeof object == "object" && 'splice' in object && 'join' in object; },
        'issubclass': function(){ throw new NotImplementedError();},
        'isdict': function isdict() { return false },
        'iter': function(){ throw new NotImplementedError();},
        'keys': function keys(object){ 
            return [e for (e in object)];
        },
        'len': function len(object) {
            switch (typeof(object)) {
                case 'undefined': throw new TypeError("object of type 'undefined' has no len()");
                case 'string': return object.length;
                case 'boolean': throw new TypeError("object of type 'bool' has no len()");
                case 'number': throw new TypeError("object of type 'number' has no len()");
                default: {
                        if (isfunction(object['__len__'])) {
                            return object.length;
                        } else if (isarray(object)) {
                            return object.length;
                        } else {
                            return keys(object).length;
                        }
                }
            }
            throw new TypeError("object of type '" + typeof(object) + "' has no len()");
        },
        'license': function(){ throw new NotImplementedError();},
        'array': function array(iterable) {
            if (!iterable) return [];
            if (iterable.to_array) return iterable.to_array();
            if (isfunction(iterable['__iterator__'])) return [e for each (e in iterable)];
            if (isfunction(iterable['next'])) {
                var ret = [];
                try {
                    while (true) ret.push(iterable.next());
                } catch (stop) {}
                return ret;
            }
            var length = iterable.length || 0, results = new Array(length);
            while (length--) results[length] = iterable[length];
            return results;
        },
        'locals': function(){ return __modules__[this['__name__']]; },
        'long': function(){ throw new NotImplementedError();},
        'map': function(){ throw new NotImplementedError();},
        'max': function(){ throw new NotImplementedError();},
        'min': function(){ throw new NotImplementedError();},
        'mult': function mult(array, value) {
            var result = [];
            for (var i = 0; i < value; i++)
                result = result.concat(array);
            return result;
        },
        'oct': function(){ throw new NotImplementedError();},
        'open': function(){ throw new NotImplementedError();},
        'ord': function(Ascii){ return Ascii.charCodeAt(0); },
        'pow': function(){ throw new NotImplementedError();},
        //'property': function(){ throw new NotImplementedError();},
        'print': function print() {
            if (!isundefined(window.console) && !isundefined(window.console.log))
                console.log.apply(console, arguments);
        },
        'quit': function(){ throw new NotImplementedError();},
        'range': function xrange(start, stop, step){
            var rstep = step || 1;
            var rstop = isundefined(stop)? start : stop;
            var rstart = isundefined(stop)? 0 : start;
            var ret = [];
            for (var i = rstart; i < rstop; i += rstep)
                ret.push(i);
            return ret;
        },
        'raw_input': function(){ throw new NotImplementedError();},
        'reduce': function(){ throw new NotImplementedError();},
        'reload': function(){ throw new NotImplementedError();},
        'repr': function(){ throw new NotImplementedError();},
        'reversed': function(){ throw new NotImplementedError();},
        'round': function(){ throw new NotImplementedError();},
        'set': function(){ throw new NotImplementedError();},
        'setattr': function(){ throw new NotImplementedError();},
        'slice': function(){ throw new NotImplementedError();},
        'sorted': function(){ throw new NotImplementedError();},
        'staticmethod': function(){ throw new NotImplementedError();},
        'str': function str(object) {
            if (!isundefined(object['__str__'])) return object.__str__();
            return String(object)
        },
        'sum': function(){ throw new NotImplementedError();},
        'super': function(){ throw new NotImplementedError();},
        'type': function type(object) {
            return object.constructor;
        },
        'toquerypair': function toquerypair(key, value) {
            if (isundefined(value)) return key;
            return key + '=' + encodeURIComponent(String.interpret(value)); },
        'toquerystring': function toquerystring(object) {
            var result = [];
            for (var [key, value] in Iterator(object)) {
                var key = encodeURIComponent(key), values = value;
                if (values && typeof values == 'object') {
                    if (isarray(values))
                        result = result.concat(values.map(toquerypair.curry(key)));
                } else result.push(toquerypair(key, values));
            }
            return result.join('&'); },
        'values': function keys(obj){ return [e for each (e in obj)] },
        'unichr': function(){ throw new NotImplementedError();},
        'unicode': function(){ throw new NotImplementedError();},
        'unique': function unique(sorted) {
            return sorted.reduce(function(array, value) {
                if (!include(array, value))
                    array.push(value);
                return array;
                }, []);
        },
        'vars': function(){ throw new NotImplementedError();},
        'xrange': function xrange(start, stop, step){
            var xstep = step || 1;
            var xstop = isundefined(stop)? start : stop;
            var xstart = isundefined(stop)? 0 : start;
            for (var i = xstart; i < xstop; i += xstep)
                yield i;
        },
        'zip': function(){
            var args = array(arguments);

            var collections = args.map(array);
            var array1 = collections.shift();
            return array1.map( function(value, index) { 
                return [value].concat(collections.map( function (v) {
                    return v[index];
                }));
            });
        }
    });
    //Populate builtin
    __builtins__(__modules__['__builtin__']);

    var Exception = __class__('Exception', {
        __init__: function(message) {
            this.error = new Error(message);
            this.error.name = this.__name__;
        },

        __str__: function() {
            return this.error.message;
        }
    });

    __modules__['exceptions'] = new module('exceptions', 'built-in', {
        'Exception': Exception,
        'ArithmeticError': new Error(),
        'AssertionError': __class__('AssertionError', Exception),
        'AttributeError': __class__('AttributeError', Exception),
        'BaseException': new Error(),
        'DeprecationWarning': new Error(),
        'EOFError': new Error(),
        'EnvironmentError': new Error(),
        'FloatingPointError': new Error(),
        'FutureWarning': new Error(),
        'GeneratorExit': new Error(),
        'IOError': new Error(),
        'LoadError':  __class__('LoadError', Exception),
        'ImportWarning':  new Error(),
        'IndentationError':  new Error(),
        'IndexError':  new Error(),
        'KeyError':  __class__('KeyError', Exception),
        'LookupError':  new Error(),
        'MemoryError':  new Error(),
        'NameError':  new Error(),
        'NotImplementedError':  __class__('NotImplementedError', Exception),
        'OSError':  new Error(),
        'OverflowError':  new Error(),
        'PendingDeprecationWarning':  new Error(),
        'ReferenceError':  new Error(),
        'RuntimeError':  new Error(),
        'RuntimeWarning':  new Error(),
        'StandardError':  new Error(),
        'SyntaxError':  new Error(),
        'SyntaxWarning':  new Error(),
        'SystemError':  new Error(),
        'SystemExit':  new Error(),
        'TabError':  new Error(),
        'TypeError':  __class__('TypeError', Exception),
        'UnboundLocalError':  new Error(),
        'UnicodeDecodeError':  new Error(),
        'UnicodeEncodeError':  new Error(),
        'UnicodeError':  new Error(),
        'UnicodeTranslateError':  new Error(),
        'UnicodeWarning':  new Error(),
        'UserWarning':  new Error(),
        'ValueError':  __class__('ValueError', Exception),
        'Warning':  new Error(),
        'ZeroDivisionError':  new Error()
    });
    //Populate exceptions
    __builtins__(__modules__['exceptions']);

    __modules__['errno'] = new module('errno', 'built-in', {});

    __modules__['_codecs'] = new module('_codecs', 'built-in', {});

    __modules__['zipimport'] = new module('zipimport', 'built-in', {});

    __modules__['sys'] = new module('sys', 'built-in', {
        'path': __path__,
    });

    __modules__['_types'] = new module('_types', 'built-in', {});

    __modules__['signal'] = new module('signal', 'built-in', {});

    __modules__['posix'] = new module('posix', 'built-in', {});

})();

(function(){
    // Protopy Object
    var Protopy = {
        'Version': '0.01',

        'Browser': {
            'IE':     !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
            'Opera':  navigator.userAgent.indexOf('Opera') > -1,
            'WebKit': navigator.userAgent.indexOf('AppleWebKit/') > -1,
            'Gecko':  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1,
            'MobileSafari': !!navigator.userAgent.match(/Apple.*Mobile.*Safari/),
            'Features': {
                'XPath': !!document.evaluate,
                'SelectorsAPI': !!document.querySelector,
                'ElementExtensions': !!window.HTMLElement,
                'SpecificElementExtensions': document.createElement('div')['__proto__'] &&
                                                document.createElement('div')['__proto__'] !==
                                                document.createElement('form')['__proto__']
            }
        },
        
        'ScriptFragment': '<script[^>]*>([\\S\\s]*?)<\/script>',
        'JSONFilter': /^\/\*-secure-([\s\S]*)\*\/\s*$/,
        'emptyfunction': function(){},
        'identityfunction': function(x) {return x;}
    }

    var Dict = Class('Dict', {
        __init__: function(object) {
            this._value = {};
            this._key = {};
            if (isundefined(object)) return;
            if (isarray(object) && !bool(object)) return;
            if (object instanceof Dict) {
                this._value = extend({}, object._value);
                this._key = extend({}, object._key);
            } else if (isfunction(object['next'])) {
                for each (var [key, value] in object)
                    this.set(key, value);
            } else if (isarray(object) && isarray(object[0])) {
                for each (var [key, value] in object)
                    this.set(key, value);
            } else if (object instanceof Object){
                for (var key in object)
                    this.set(key, object[key]);
            }
        },
    
        __iter__: function() {
            for each (var hash in this._value) {
                var value = this._value[hash], key = this._key[hash];
                var pair = [key, value];
                pair.key = key;
                pair.value = value;
                yield pair;
            }
        },

        __copy__: function() {
            return new Dict(this);
        },
        
        size: function() {
            return keys(this._key).length;
        },

        set: function(key, value) {
            var hash = id(key);
            this._key[hash] = key;
            return this._value[hash] = value;
        },

        setdefault: function(key, value){
            var ret = this.get(key);
            if (ret) return ret;
            return this.set(key, value);
    
        },
    
        get: function(key, otherwise) {
            var hash = id(key);
            var value = this._value[hash];
            if (value)
                return value;
            else otherwise
                return otherwise;
        },
    
        unset: function(key) {
            var hash = id(key);
            var value = this._value[hash];
            delete this._value[hash];
            delete this._key[hash];
            return value;
        },
    
        to_object: function() {
            return create(this.to_array());
        },
    
        keys: function() {
            return [k for each (k in this._key)];
        },
    
        values: function () {
            return [v for each (v in this._value)];
        },

        to_array: function() {
            return zip(this.keys(), this.values());
        },

        items: function() {
            return this.to_array();
        },
    
        index: function(value) {
            var match = this.detect(function(pair) {
                return pair.value === value;
            });
            return match && match.key;
        },
    
        update: function(object) {
            for (var hash in object._key)
                this.set(object._key[hash], object._value[hash]);
        },
    
        inspect: function() {
            return '#<Dict:{' + this.map(function(pair) {
                return pair.map(inspect).join(': ');
            }).join(', ') + '}>';
        },
    
        to_JSON: function() {
            return to_JSON(this.to_object());
        },
    
        pop: function(key) {
            var val = this.unset(key);
            if (isundefined(val))
                throw new KeyError(key);
            return val;
        },
    
        popitem: function() {
            var val = this.unset(key);
            if (isundefined(val))
                throw new KeyError(key);
            return [key, val];
        },
    
        clear: function() {
            this._value = {};
            this._key = {};
        },
    
        has_key: function(key) {
            var hash = id(key);
            return hash in this._key;
        }
    });
    $B({'Protopy': Protopy, 'Dict': Dict});
})();

//------------------------------------ Extendin JavaScript --------------------------------//
(function(){
//--------------------------------------- Functions -------------------------------------//
extend(Function.prototype, {
  extra_arguments: function(func_arguments, defaults) {
    var names = this.argument_names();
    var result = [];
    var kwargs = defaults || {};
    var func_arguments = array(func_arguments);
    if (func_arguments[func_arguments.length - 1] instanceof Object &&
        !isclass(func_arguments[func_arguments.length - 1]) &&
        !isinstance(func_arguments[func_arguments.length - 1]) &&
        !isarray(func_arguments[func_arguments.length - 1])) {
        extend(kwargs, func_arguments.pop());
        result.push(kwargs);
    } else {
        result.push(kwargs);
    }
    if (names.length < func_arguments.length)
        result.push(func_arguments.slice(names.length, func_arguments.length));
    else
        result.push([]);
    return result.reverse();
  },

  argument_names: function() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^\)]*)\)/)[1].replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  },

  bind: function() {
    if (arguments.length < 2 && isundefined(arguments[0])) return this;
    var __method = this, args = array(arguments), object = args.shift();
    return function() { return __method.apply(object, args.concat(array(arguments))); }
  },

  curry: function() {
    if (!arguments.length) return this;
    var __method = this, args = array(arguments);
    return function() { return __method.apply(this, args.concat(array(arguments))); }
  },

  delay: function() {
    var __method = this, args = array(arguments), timeout = args.shift() * 1000;
    return window.setTimeout(function() { return __method.apply(__method, args); }, timeout);
  },

  defer: function() {
    var args = [0.01].concat(array(arguments));
    return this.delay.apply(this, args);
  },

  wrap: function(wrapper) {
    var __method = this;
    return function() { return wrapper.apply(this, [__method.bind(this)].concat(array(arguments))); }
  }
});

//--------------------------------------- String -------------------------------------//
extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

extend(String.prototype, {
  gsub: function(pattern, replacement) {
    var result = '', source = this, match;
    replacement = arguments.callee.prepare_replacement(replacement);

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  },

  sub: function(pattern, replacement, count) {
    replacement = this.gsub.prepare_replacement(replacement);
    count = isundefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  },

  scan: function(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  },

  //% operator like python
  subs: function() {
    var args = flatten(array(arguments));
    //%% escaped
    var string = this.gsub(/%%/, function(match){ return '<ESC%%>'; });
    if (args[0] && args[0].constructor == Object)
        string = new Template(string, args[1]).evaluate(args[0]);
    else
        string = string.gsub(/%s/, function(match) { return (args.length != 0)? str(args.shift()) : match[0]; });
    return string.gsub(/<ESC%%>/, function(match){ return '%'; });
  },

  truncate: function(length, truncation) {
    length = length || 30;
    truncation = isundefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  },

  strip: function() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  },

  strip_tags: function() {
    return this.replace(/<\/?[^>]+>/gi, '');
  },

  strip_scripts: function() {
    return this.replace(new RegExp(Protopy.ScriptFragment, 'img'), '');
  },

  extract_scripts: function() {
    var matchAll = new RegExp(Protopy.ScriptFragment, 'img');
    var matchOne = new RegExp(Protopy.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  },

  eval_scripts: function() {
    return this.extractScripts().map(function(script) { return eval(script) });
  },

  escape_HTML: function() {
    var self = arguments.callee;
    self.text.data = this;
    return self.div.innerHTML;
  },

  unescape_HTML: function() {
    var div = new Element('div');
    div.innerHTML = this.stripTags();
    return div.childNodes[0] ? (div.childNodes.length > 1 ?
      array(div.childNodes).reduce(function(memo, node) { return memo+node.nodeValue }, '') :
      div.childNodes[0].nodeValue) : '';
  },

  to_query_params: function(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').reduce(function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!isarray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    }, {});
  },

  to_array: function() {
    return this.split('');
  },

  succ: function() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  },

  times: function(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  },

  camelize: function() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];

    var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++)
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

    return camelized;
  },

  capitalize: function() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  },

  underscore: function() {
    return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase();
  },

  dasherize: function() {
    return this.gsub(/_/,'-');
  },

  inspect: function(useDoubleQuotes) {
    var escapedString = this.gsub(/[\x00-\x1f\\]/, function(match) {
      var character = String.specialChar[match[0]];
      return character ? character : '\\u00' + match[0].charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  },

  to_JSON: function() {
    return this.inspect(true);
  },

  unfilter_JSON: function(filter) {
    return this.sub(filter || Protopy.JSONFilter, '#{1}');
  },

  is_in: function(array) {
    return array.indexOf(String(this)) > -1;
  },

  is_JSON: function() {
    var str = this;
    if (str.blank()) return false;
    str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
  },

  eval_JSON: function(sanitize) {
    var json = this.unfilter_JSON();
    try {
      if (!sanitize || json.is_JSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  },

  starts_with: function(pattern) {
    return this.indexOf(pattern) === 0;
  },

  ends_with: function(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  },

  blank: function() {
    return /^\s*$/.test(this);
  }
});

String.prototype.gsub.prepare_replacement = function(replacement) {
  if (isfunction(replacement)) return replacement;
  var template = new Template(replacement);
  return function(match) { return template.evaluate(match) };
};

String.prototype.parse_query = String.prototype.to_query_params;

extend(String.prototype.escape_HTML, {
  div:  document.createElement('div'),
  text: document.createTextNode('')
});

String.prototype.escape_HTML.div.appendChild(String.prototype.escape_HTML.text);

})();

//--------------------------------------- More builtins -----------------------------------------//
(function(){
//--------------------------------------- Template -----------------------------------------//
var Template = Class('Template', {
    //Static
    Pattern: /(^|.|\r|\n)(%\((.+?)\))s/,
},{
    //Prototype
  __init__: function(template, pattern) {
    this.template = str(template);
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (isfunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return '';

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3];
      var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].starts_with('[') ? match[2].gsub('\\\\]', ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});

//--------------------------------------- Try ----------------------------------------------//

var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

//--------------------------------------- Ajax ----------------------------------------------//

var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  register: function(responder) {
    if (!include(this.responders, responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    for each (var responder in this.responders) {
      if (isfunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    }
  }
};

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});

Ajax.Base = Class('Base', {
  __init__: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (isstring(this.options.parameters))
      this.options.parameters = this.options.parameters.to_query_params();
    else if (isdict(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});

Ajax.Request = Class('Request', Ajax.Base, {
  _complete: false,

  __init__: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = extend({}, this.options.parameters);

    if (!include(['get', 'post'], this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = toquerystring(params)) {
      // when GET, append parameters to URL
      if (this.method == 'get')
        this.url += (include(this.url, '?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Protopy-Version': Protopy.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    // user-defined headers
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (isfunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300);
  },

  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Protopy.emptyfunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Protopy.emptyfunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = Protopy.emptyfunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilter_JSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Protopy.emptyfunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Un__init__d', 'Loading', 'Loaded', 'Interactive', 'Complete'];

Ajax.Response = Class('Response', {
  __init__: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if((readyState > 2 && !Protopy.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if(readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = isundefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,
  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !include((this.getHeader('Content-type') || ''), 'application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

$B({'Template': Template, 'Try': Try, 'Ajax': Ajax});

})();
//------------------------------------------------------------------------------//