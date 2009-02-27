(function(){
    var __modules__ = {}
    var __path__ = {'':'/packages/'}
    var __resources__ = {}
    
    //Extend form objects to object
    function __extend__(safe, destiny) {
	for (var i = 2, length = arguments.length; i < length; i++) {
	    var object = arguments[i];
	    var back_iter = object['__iterator__'];
	    delete object['__iterator__'];
	    for (var name in object) {
            if (safe || name.search(/^__.*__$/) == -1) {
                var getter = object.__lookupGetter__(name);
                var setter = object.__lookupSetter__(name);
                if (getter)
                    destiny.__defineGetter__(name, getter);
                if (setter)
                    destiny.__defineSetter__(name, setter);
                if (getter || setter) continue;
                destiny[name] = object[name];
            }
	    }
	    if (back_iter) object['__iterator__'] = back_iter;
	}
	return destiny;
    }

    //Publish simbols in mododules
    function __publish__(object) {
        for (var k in object) {
            __modules__[this['__name__']][k] = object[k];
        }
    }

    //Publish resources
    function __resource__(object) {
        //TODO: validate
    }
    
    //Add simbols to builtins
    function __builtin__(object) {
        __extend__(false, __modules__['__builtin__'], object);
        __extend__(false, __modules__['__main__']['__builtins__'], object);
        __extend__(false, window, object);
    }
    
    //Add doc string to modules
    function __doc__(doc) {
        __modules__[this['__name__']]['__doc__'] = doc;
    }
    
    //The module concept
    function Module(name, file, source) {
        this['__file__'] = file;
        this['__name__'] = name;
        if (file == 'built-in') {
            if (source && source instanceof Object)
                __extend__(true, this, source);
        } else {
            // Only for non builtins modules
            this['__builtins__'] = {};
            __extend__(false, this['__builtins__'], __modules__['__builtin__']);
            this['__builtins__']['__file__'] = file;
            this['__builtins__']['__name__'] = name;
        }
    }
    
    //Load Modules
    function __load__(name) {
        var names = name.split('.'),
            mod = __modules__[name],
            path = null;
    
        if (!mod) {
            var base = (__path__[names[0]] == undefined) ? __path__[''] : __path__[names.shift()],
                file = base + names.join("/") + '.js',
                code = null;
                if (names[0])
            new Ajax.Request(file, {
                asynchronous : false,
                evalJS: false,
                'onSuccess': function onSuccess(transport) {
                    code = '(function(){ ' + transport.responseText + '});';
                },
                onException: function (obj, exception){
                    throw exception;
                },
                'onFailure': function onFailure(){
                    file = base + names.join("/") + "/__init__.js";
                    new Ajax.Request(file, {
                        asynchronous : false,
                        evalJS: false,
                        'onSuccess': function onSuccess(transport) {
                            code = '(function(){' + transport.responseText + '});';
                            path = base + names.join("/");
                        },
                        onException: function (obj, exception){
                            throw exception;
                        },
                        'onFailure': function onFailure(){
                            throw new LoadError();
                        }
                    });
                }
            });
            if (code) {
                mod = new Module(name, file);
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
                    this[last] = mod;
                    __modules__[this['__name__']][last] = mod;
                    return mod;
    
            case 2:
                    // If all contents were requested returns nothing
                    if (arguments[1] == '*') {
                        __extend__(false, this, mod);
                        __extend__(false, __modules__[this['__name__']], mod);
                        return;
    
                    // second arguments is the symbol in the package
                    } else {
                        var n = arguments[1];
                        this[n] = mod[n];
                        __modules__[this['__name__']][n] = mod[n];
                        return mod[n];
                    }
    
            default:
                    // every argyment but the first one are a symbol
                    // returns nothing
                    for (var i = 1, length = arguments.length; i < length; i++) {
                        this[arguments[i]] = mod[arguments[i]];
                        __modules__[this['__name__']][arguments[i]] = mod[arguments[i]];
                    }
                    return;
        }
    }
    
    //----------------Types and Objects---------------------//
    function object() { throw 'The wormhole stop here. Please, is just javascript not python :)'; };

    //For the Class
    object.__class__ = type;
    object.__new__ = function __new__(name, bases, attrs) {
        //Herencia
        var superbase = function() {};
        superbase.prototype = {};
        for each (var base in bases.reverse()) {
            __extend__(true, superbase.prototype, base.prototype);
        }
        this.prototype.__proto__ = superbase.prototype;

        for (var name in attrs)
            __extend__(true, this.prototype, attrs);

        // Decorate javascript
        this.prototype.toString = this.prototype.__str__;
        if (this.prototype.__iter__)
            this.prototype.__iterator__ = this.prototype.__iter__;
        this.prototype.constructor = this;
        this.prototype.__class__ = this;
    };
    object.__base__ = null;
    object.__bases__ = [];
    object.__subclasses__ = [];
    object.__static__ = {};
    object.__doc__ = "";

    //For de Instance
    object.prototype.__init__ = function __init__(){};
    object.prototype.__doc__ = "";
    object.prototype.__hash__ = function __hash__(){ return 1234567; };
    object.prototype.__str__ = function __str__(){ return this.__module__ + '.' + this.__name__ };

    // Type constructor
    function type(name) {
	if (name == undefined || name == null)
	    throw new TypeError('Invalid arguments');
	    var args = Array.prototype.slice.call(arguments).slice(1);
	    if ((name || name === "") && args.length == 0)
		return name.constructor;
	    if (args[0] instanceof Array && args[0][0] != undefined)
		var bases = args.shift();
	    else if (!(args[0] instanceof Array) && args[0] instanceof Function)
		var bases = [args.shift()];
	    else var bases = [object];
	    if (args[0] instanceof Object && args.length == 2) {
		var classAttrs = args.shift();
		var instanceAttrs = args.shift();
	    } else if (args.length == 1) {
		var classAttrs = {};
		var instanceAttrs = args.shift();
	    } else if (args.length == 0) {
		var classAttrs = {};
		var instanceAttrs = {};
	} else new TypeError('Invalid arguments');

	var new_type = eval('(function ' + name + '() { this.__init__.apply(this, arguments); })');

	//Jerarquia
	new_type.__base__ = bases[0];
	new_type.__bases__ = bases;
	new_type.__subclasses__ = [];
	new_type.__static__ = __extend__(true, {}, classAttrs);
	for each (var base in bases.reverse()) {
	    base.__subclasses__.push(new_type);
	    __extend__(true, new_type, base.__static__);
	    new_type.__new__ = base.__new__;
	}

	//Decorando los atributos
	classAttrs['__name__'] = instanceAttrs['__name__'] = name;
	classAttrs['__module__'] = instanceAttrs['__module__'] = this['__name__'];

	//Construyendo el tipo
	for (var name in classAttrs)
	    __extend__(true, new_type, classAttrs);

	//Constructor de instancia
	new_type.__new__(new_type.__name__, new_type.__bases__, instanceAttrs);
	return new_type;
    }

    var Exception = type('Exception', {
        '__init__': function(message) { this.message = message; },
        '__str__': function() { return this.__name__ + ': ' + this.message; }
    });
    
    //__main__ module
    __modules__['__main__'] = new Module('__main__','built-in', {'__builtins__': {}, '__doc__': "Welcome to protopy" });
    __modules__['__builtin__'] = new Module('__builtin__','built-in');
   
    __modules__['exceptions'] = new Module('exceptions', 'built-in', {
        'Exception': Exception,
        'AssertionError': type('AssertionError', Exception),
        'AttributeError': type('AttributeError', Exception),
        'LoadError':  type('LoadError', Exception),
        'KeyError':  type('KeyError', Exception),
        'NotImplementedError':  type('NotImplementedError', Exception),
        'TypeError':  type('TypeError', Exception),
        'ValueError':  type('ValueError', Exception),
    });

    function getattr(object, name, def) {
	//TODO: validar argumentos
	var attr = object[name];
	if (attr == undefined) {
	    if (def == undefined)
		throw new AttributeError(object + ' has no attribute ' + name);
	    else
		return def;
	}
	if (type(attr) == Function) {
	    var method = attr, obj = object;
	    return function() { return method.apply(obj, array(arguments)); }
	} else {
	    return attr;
	}
	throw new AttributeError(object + ' has no attribute ' + name);
    }
    
    function setattr(object, name, value) {
	object[name] = value;
    }

    function hasattr(object, name){
	try {
	    getattr(object, name);
	    return true;
	} catch (e if e instanceof AttributeError){
	    return false;
	}
    }
    
    //Populate exceptions
    __builtin__(__modules__['exceptions']);

    __modules__['errno'] = new Module('errno', 'built-in');
    
    __modules__['_codecs'] = new Module('_codecs', 'built-in');
    
    __modules__['zipimport'] = new Module('zipimport', 'built-in');
    
    __modules__['sys'] = new Module('sys', 'built-in', { 'path': __path__ });
    
    __modules__['_types'] = new Module('_types', 'built-in');
    
    __modules__['signal'] = new Module('signal', 'built-in');
    
    __modules__['posix'] = new Module('posix', 'built-in');

    __extend__(true, __modules__['__main__']['__builtins__'], __modules__['__builtin__']);
    __extend__(true, window, __modules__['__main__']);

    //Populate new builtins
    __builtin__({
        '$P': __publish__,
        '$L': __load__,
        '$B': __builtin__,
        '$R': __resource__,
        '$D': __doc__,
	'object': object,
	'type': type,
	'getattr': getattr,
	'setattr': setattr,
	'hasattr': hasattr,
	'extend': function extend() {return __extend__.apply(this, [false].concat(array(arguments)));},
	'ls': function ls(obj){ return keys(__modules__[(obj && obj['__name__']) || this['__name__']]); },
	'locals': function locals(){ return __modules__[this['__name__']]; },
	'globals': function globals(){ return __modules__['__main__']; }
    });
})();

// More builtins functions and types
(function(){
    function super(_type, _object) {
        //TODO: Validar que sea una instancia a subclase del tipo dado
        //TODO: soportar distintos tipos incluso el mismo tipo de la base que le pase el primero de __bases__
        var obj = {};
        if (type(_object) == Function) {
            if (_type && issubclass(_object, _type))
                var base = _type.__base__;
            else if (!_type)
                var base = window.object;
            else
                var base = _type;
        } else {
            if (isinstance(_object, _type))
                var base = _type.prototype;
            else
                throw new TypeError('Nonno');
        }
        var object = _object;
        obj.__noSuchMethod__ = function(name, args) {
            if (args[args.length - 1] && args[args.length - 1] instanceof Arguments)
                return base[name].apply(_object, args.slice(0, -1).concat(args[args.length -1].argskwargs));
            else
                return base[name].apply(_object, args);
        };
        return obj;
    }

    function isinstance(object, type) {
	if (type && type.constructor != Array) type = [type];
	if (type.constructor == Array && type[0] == undefined)
	    // end of recursion
	    return false;
	else {
	    var others = [];
	    for each (var t in type) {
		if (object instanceof t) return true;
		others = others.concat(t.__subclasses__);
	    }
	    return isinstance(object, others);
	}
    }

    function issubclass(type2, type) {
	if (type && type.constructor != Array) type = [type];
	if (type.constructor == Array && type[0] == undefined)
	    // end of recursion
	    return false;
	else {
	    var others = [];
	    for each (var t in type) {
		if (type2 == t) return true;
		others = others.concat(t.__subclasses__);
	    }
	    return issubclass(type2, others);
	}
    }

    //Arguments wraped, whit esteroids
    var Arguments = type('Arguments', [object], {
        '__init__': function __init__(args, def) {
            this.func = args.callee;
            this.collect = Array.prototype.slice.call(args);
            var names = this.func.toString().match(/^[\s\(]*function[^(]*\(([^\)]*)\)/)[1].replace(/\s+/g, '').split(',');
            this.names = names.length == 1 && !names[0] ? [] : names;
            this._defaults = def;
            for (var i = 0, length = this.names.length; i < length; i++)
            this[this.names[i]] = this[i] = this.collect[i];
            this.populated = false;
        },
	
        '_populate': function _populate() {
            this._kwargs = {};
            for (p in this._defaults || {})
                this._kwargs[p] = this._defaults[p];
            if (this.collect[this.collect.length - 1] instanceof Object) {
                let object = this.collect[this.collect.length - 1];
                for (p in object)
                    this._kwargs[p] = object[p];
            }
            if (this.names.length < this.collect.length)
                this._args = this.collect.slice(this.names.length, (bool(this._kwargs))? this.collect.length - 1 : this.collect.length);
            else
                this._args = [];
            this.populated = true;
        },

        '__iter__' :function(){
            for each (var arg in this.collect)
                yield arg;
        },

        get args() {
            if (!this.populated)
                this._populate();
            return this._args;
        },

        get kwargs() {
            if (!this.populated)
                this._populate();
            return this._kwargs;
        },

        get argskwargs() {
            if (!this.populated)
                this._populate();
            var result = [];
            if (this._args)
                result = result.concat(this._args);
            if (this._kwargs)
                result.push(this._kwargs);
            return result;
        }
    });

    var __HASHTABLE__  = "w5Q2KkFts3deLIPg8Nynu_JAUBZ9YxmH1XW47oDpa6lcjMRfi0CrhbGSOTvqzEV";

    function hash(object) {
        if (object == undefined || object == null) throw new TypeError('undefined or null are unhashable');
        if (type(object) != String && type(object) != Number) throw new TypeError(object + ' objects are unhashable');
        if (type(object) == Number) return object;
        var h = 0;
        for (var j = object.length-1; j >= 0; j--) {
            h ^= __HASHTABLE__.indexOf(object.charAt(j)) + 1;
            for (var i=0; i<3; i++) {
                var m = (h = h << 7 | h >>> 25) & 150994944;
                h ^= m ? (m == 150994944 ? 1 : 0) : 1;
            }
        }
        return h;
    }

    function id(value) {
        if (!value)
            return 'null';
        if (type(value) == Number || type(value) == String)
            return value;
        else if (type(value) == Array)
            return value.reduce(function(x, y) {return "" + id(x) + id(y)});
        else if (!value['__hash__']) {
            value['__hash__'] = id.next();
        }
        return value['__hash__'];
    };

    id.current = 0;
    id.next = function () { return id.current += 1; };
    id.__doc__ = "I'm sorry";

    //Populate builtin
    $B({
        'super': super,
        'isinstance': isinstance,
        'issubclass': issubclass,
        'Arguments': Arguments,
        'hash': hash,
        'id': id,
        'assert': function assert( test, text ) {
            if ( test === false )
                throw new AssertionError( text );
            return test;
        },
        'bool': function bool(object) {
            if (object == null) return false;
            switch (typeof(object)) {
                case 'undefined': return false;
                case 'string': return object != '';
                case 'boolean': return object != false;
                case 'number': return object != 0;
                default: {
                        if (callable(object['__nonzero__'])) {
                            return object.__nonzero__();
                        } else if (type(object) == Array) {
                            return object.length != 0;
                        } else {
                            return keys(object).length != 0;
                        }
                }
            }
            throw new TypeError("object of type '" + typeof(object) + "' has no bool()");
        },
        'callable': function callable(object) {
            return object && type(object) == Function;
        },
        'chr': function chr(number){ 
                if (type(number) != Number) throw new TypeError('An integer is required');
                return String.fromCharCode(number);
        },
        'ord': function(ascii) { 
            if (type(number) != String) throw new TypeError('An string is required');
            return ascii.charCodeAt(0);
        },
        'bisect': function bisect(array, element) {
            var i = 0;
            for (var length = array.length; i < length; i++)
                if (array[i].__cmp__(element) > 0) return i;
            return i;
        },
        //no se porque no anda el dir
        'equal': function(object1, object2){
            if (callable(object1['__eq__'])) return object1.__eq__(object2);
            return object1 == object2;
        },
        'nequal': function(object1, object2){
            if (callable(object1['__ne__'])) return object1.__ne__(object2);
            return object1 != object2;
        },
        'filter': function filter(func, sequence){ 
    
        },
        'float': function float(value) {
            if (type(value) != String || type(value) != Number) throw new TypeError('Argument must be a string or a number');
            var number = Number(value);
            if (isNaN(number))
                throw new ValueError('Invalid literal');
            return number;
        },
        'flatten': function flatten(array) { 
            return array.reduce(function(a,b) { return a.concat(b); }, []); 
        },
        'help': function help(module){
            module = module || this;
            print(module['__doc__']);
        },
        'include': function include(object, element){
            if (object == undefined) return false;
            if (callable(object['__contains__'])) return object.__contains__(element);
            return object.indexOf(element) > -1;
        },
        'int': function int(value) {
            if (type(value) != String || type(value) != Number) throw new TypeError('Argument must be a string or a number');
            var number = Math.floor(value);
            if (isNaN(number))
                throw new ValueError('Invalid literal');
            return number;
        },
        'len': function len(object) {
            switch (typeof(object)) {
                case 'undefined': throw new TypeError("object of type 'undefined' has no len()");
                case 'string': return object.length;
                case 'boolean': throw new TypeError("object of type 'bool' has no len()");
                case 'number': throw new TypeError("object of type 'number' has no len()");
                default: {
                        if (callable(object['__len__'])) {
                            return object.__len__();
                        } else if (type(object) == Array) {
                            return object.length;
                        } else {
                            return keys(object).length;
                        }
                }
            }
            throw new TypeError("object of type '" + typeof(object) + "' has no len()");
        },
        'array': function array(iterable) {
            if (!iterable) return [];
            if (callable(iterable['__iterator__'])) return [e for each (e in iterable)];
            var length = iterable.length || 0, results = new Array(length);
            while (length--) results[length] = iterable[length];
            return results;
        },
        'mult': function mult(array, value) {
            var result = [];
            for (var i = 0; i < value; i++)
                result = result.concat(array);
            return result;
        },
        'print': function print() {
            if (window.console && window.console.log)
                console.log.apply(console, arguments);
        },
        'range': function xrange(start, stop, step){
            var rstep = step || 1;
            var rstop = (stop == undefined)? start : stop;
            var rstart = (stop == undefined)? 0 : start;
            var ret = [];
            for (var i = rstart; i < rstop; i += rstep)
                ret.push(i);
            return ret;
        },
        'str': function str(object) {
            if (object && callable(object['__str__'])) return object.__str__();
            return String(object);
        },
        'values': function values(obj){ 
            return [e for each (e in obj)]
        },
        'keys': function keys(object){
            return [e for (e in object)];
        },
	'items': function items(object){
            return zip(keys(object), values(object));
        },
        'unique': function unique(sorted) {
            return sorted.reduce(function(array, value) {
                if (!include(array, value))
                    array.push(value);
                return array;
                }, []);
        },
        'xrange': function xrange(start, stop, step){
            var xstep = step || 1;
            var xstop = (!stop)? start : stop;
            var xstart = (!stop)? 0 : start;
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
})();

//------------------------------------ Extendin JavaScript --------------------------------//
(function(){
    //--------------------------------------- Functions -------------------------------------//
    extend(Function.prototype, {
	'curry': function curry() {
	    if (!arguments.length) return this;
	    var __method = this, args = array(arguments);
	    return function() { return __method.apply(this, args.concat(array(arguments))); }
	},

	'delay': function delay() {
	    var __method = this, args = array(arguments), timeout = args.shift() * 1000;
	    return window.setTimeout(function() { return __method.apply(__method, args); }, timeout);
	},

	'defer': function defer() {
	    var args = [0.01].concat(array(arguments));
	    return this.delay.apply(this, args);
	}
    });

    //--------------------------------------- String -------------------------------------//
    extend(String, {
	'interpret': function interpret(value) {
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
	'gsub': function gsub(pattern, replacement) {
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

	'sub': function sub(pattern, replacement, count) {
	    replacement = this.gsub.prepare_replacement(replacement);
	    count = (!count) ? 1 : count;

	    return this.gsub(pattern, function(match) {
	    if (--count < 0) return match[0];
	    return replacement(match);
	    });
	},

	'scan': function scan(pattern, iterator) {
	    this.gsub(pattern, iterator);
	    return String(this);
	},

	//% operator like python
	'subs': function subs() {
	    var args = flatten(array(arguments));
	    //%% escaped
	    var string = this.gsub(/%%/, function(match){ return '<ESC%%>'; });
	    if (args[0] && type(args[0]) == Object)
            string = new Template(string, args[1]).evaluate(args[0]);
	    else
            string = string.gsub(/%s/, function(match) { 
                return (args.length != 0)? str(args.shift()) : match[0]; });
	    return string.gsub(/<ESC%%>/, function(match){ return '%'; });
	},

	'truncate': function truncate(length, truncation) {
	    length = length || 30;
	    truncation = (!truncation) ? '...' : truncation;
	    return this.length > length ?
	    this.slice(0, length - truncation.length) + truncation : String(this);
	},

	'strip': function strip() {
	    return this.replace(/^\s+/, '').replace(/\s+$/, '');
	},

	'strip_tags': function strip_tags() {
	    return this.replace(/<\/?[^>]+>/gi, '');
	},

	'strip_scripts': function strip_scripts() {
	    return this.replace(new RegExp(Protopy.ScriptFragment, 'img'), '');
	},

	'extract_scripts': function extract_scripts() {
	    var matchAll = new RegExp(Protopy.ScriptFragment, 'img');
	    var matchOne = new RegExp(Protopy.ScriptFragment, 'im');
	    return (this.match(matchAll) || []).map(function(scriptTag) {
	    return (scriptTag.match(matchOne) || ['', ''])[1];
	    });
	},

	'eval_scripts': function eval_scripts() {
	    return this.extractScripts().map(function(script) { return eval(script) });
	},

	'escape_HTML': function escape_HTML() {
	    var self = arguments.callee;
	    self.text.data = this;
	    return self.div.innerHTML;
	},

	'unescape_HTML': function unescape_HTML() {
	    var div = new Element('div');
	    div.innerHTML = this.stripTags();
	    return div.childNodes[0] ? (div.childNodes.length > 1 ?
	    array(div.childNodes).reduce(function(memo, node) { return memo+node.nodeValue }, '') :
	    div.childNodes[0].nodeValue) : '';
	},

	'to_query_params': function to_query_params(separator) {
	    var match = this.strip().match(/([^?#]*)(#.*)?$/);
	    if (!match) return { };

	    return match[1].split(separator || '&').reduce(function(hash, pair) {
	    if ((pair = pair.split('='))[0]) {
		var key = decodeURIComponent(pair.shift());
		var value = pair.length > 1 ? pair.join('=') : pair[0];
		if (value != undefined) value = decodeURIComponent(value);

		if (key in hash) {
		if (type(hash[key]) != Array) hash[key] = [hash[key]];
		hash[key].push(value);
		}
		else hash[key] = value;
	    }
	    return hash;
	    }, {});
	},

	'succ': function succ() {
	    return this.slice(0, this.length - 1) +
	    String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
	},

	'times': function times(count) {
	    return count < 1 ? '' : new Array(count + 1).join(this);
	},

	'camelize': function camelize() {
	    var parts = this.split('-'), len = parts.length;
	    if (len == 1) return parts[0];

	    var camelized = this.charAt(0) == '-'
	    ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
	    : parts[0];

	    for (var i = 1; i < len; i++)
	    camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

	    return camelized;
	},

	'capitalize': function capitalize() {
	    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
	},

	'underscore': function underscore() {
	    return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase();
	},

	'dasherize': function dasherize() {
	    return this.gsub(/_/,'-');
	},

	'inspect': function inspect(useDoubleQuotes) {
	    var escapedString = this.gsub(/[\x00-\x1f\\]/, function(match) {
	    var character = String.specialChar[match[0]];
	    return character ? character : '\\u00' + match[0].charCodeAt().toPaddedString(2, 16);
	    });
	    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
	    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
	},

	'startswith': function startswith(pattern) {
	    return this.indexOf(pattern) === 0;
	},

	'endswith': function endswith(pattern) {
	    var d = this.length - pattern.length;
	    return d >= 0 && this.lastIndexOf(pattern) === d;
	},

	'blank': function blank() {
	    return /^\s*$/.test(this);
	}
    });

    String.prototype.gsub.prepare_replacement = function(replacement) {
	if (callable(replacement)) return replacement;
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
	'emptyfunction': function emptyfunction(){}
    }
    
    var Template = type('Template', {
        //Static
        Pattern: /(^|.|\r|\n)(%\((.+?)\))s/,
    },{
	//Prototype
    '__init__': function __init__(template, pattern) {
	this.template = str(template);
	this.pattern = pattern || Template.Pattern;
    },

    'evaluate': function evaluate(object) {
	if (callable(object.toTemplateReplacements))
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
	    var comp = match[1].startswith('[') ? match[2].gsub('\\\\]', ']') : match[1];
	    ctx = ctx[comp];
	    if (null == ctx || '' == match[3]) break;
	    expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
	    match = pattern.exec(expr);
	}

	return before + String.interpret(ctx);
	});
    }
    });

    var Try = {
	'these': function these() {
	    var returnValue;
	    for (var i = 0, length = arguments.length; i < length; i++) {
		var lambda = arguments[i];
		try {
		    returnValue = lambda();
		    break;
		} catch (e) { }
	    }
	    return returnValue; } 
    };

    //--------------------------------------- Ajax ----------------------------------------------//

    var Ajax = {
	'getTransport': function getTransport() {
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

	'register': function register(responder) {
	    if (!include(this.responders, responder))
	    this.responders.push(responder);
	},

	'unregister': function unregister(responder) {
	    this.responders = this.responders.without(responder);
	},

	'dispatch': function dispatch(callback, request, transport, json) {
	    for each (var responder in this.responders) {
	    if (callable(responder[callback])) {
		try {
		responder[callback].apply(responder, [request, transport, json]);
		} catch (e) { }
	    }
	    }
	}
    };

    Ajax.Responders.register({
        'onCreate': function() { Ajax.activeRequestCount++ },
        'onComplete': function onComplete() { Ajax.activeRequestCount-- }
    });

    Ajax.Base = type('Base', {
	'__init__': function __init__(options) {
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

	    if (type(this.options.parameters) == String)
	    this.options.parameters = this.options.parameters.to_query_params();
	}
    });

    Ajax.Request = type('Request', Ajax.Base, {
	_complete: false,

	'__init__': function __init__(url, options) {
	    super(Ajax.Base, this).__init__(options);
	    this.transport = Ajax.getTransport();
	    this.request(url);
	},

	'request': function request(url) {
	    this.url = url;
	    this.method = this.options.method;
	    var params = extend({}, this.options.parameters);

	    if (!include(['get', 'post'], this.method)) {
	    // simulate other verbs over post
	    params['_method'] = this.method;
	    this.method = 'post';
	    }

	    this.parameters = params;

	    try {
	    var response = new Ajax.Response(this);
	    if (this.options.onCreate) this.options.onCreate(response);
	    Ajax.Responders.dispatch('onCreate', this, response);

	    this.transport.open(this.method.toUpperCase(), this.url,
		this.options.asynchronous);

	    if (this.options.asynchronous) getattr(this, 'respondToReadyState').defer(1);

	    this.transport.onreadystatechange = getattr(this, 'onStateChange');
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

	'onStateChange': function onStateChange() {
	    var readyState = this.transport.readyState;
	    if (readyState > 1 && !((readyState == 4) && this._complete))
	    this.respondToReadyState(this.transport.readyState);
	},

	'setRequestHeaders': function setRequestHeaders() {
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

	    if (callable(extras.push))
		for (var i = 0, length = extras.length; i < length; i += 2)
		headers[extras[i]] = extras[i+1];
	    else
		$H(extras).each(function(pair) { headers[pair.key] = pair.value });
	    }

	    for (var name in headers)
	    this.transport.setRequestHeader(name, headers[name]);
	},

	'success': function success() {
	    var status = this.getStatus();
	    return !status || (status >= 200 && status < 300);
	},

	'getStatus': function getStatus() {
	    try {
	    return this.transport.status || 0;
	    } catch (e) { return 0 }
	},

	'respondToReadyState': function respondToReadyState(readyState) {
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

	'isSameOrigin': function isSameOrigin() {
	    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
	    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
	    protocol: location.protocol,
	    domain: document.domain,
	    port: location.port ? ':' + location.port : ''
	    }));
	},

	'getHeader': function getHeader(name) {
	    try {
	    return this.transport.getResponseHeader(name) || null;
	    } catch (e) { return null }
	},

	'evalResponse': function evalResponse() {
	    try {
	    return eval((this.transport.responseText || '').unfilter_JSON());
	    } catch (e) {
	    this.dispatchException(e);
	    }
	},

	'dispatchException': function dispatchException(exception) {
	    (this.options.onException || Protopy.emptyfunction)(this, exception);
	    Ajax.Responders.dispatch('onException', this, exception);
	}
    });

    Ajax.Request.Events = ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

    Ajax.Response = type('Response', {
    '__init__': function __init__(request){
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
	this.responseXML  = (!xml) ? null : xml;
	this.responseJSON = this._getResponseJSON();
	}
    },

    status:      0,
    statusText: '',

    getStatus: Ajax.Request.prototype.getStatus,

    'getStatusText': function getStatusText() {
	try {
	return this.transport.statusText || '';
	} catch (e) { return '' }
    },

    getHeader: Ajax.Request.prototype.getHeader,

    'getAllHeaders': function getAllHeaders() {
	try {
	return this.getAllResponseHeaders();
	} catch (e) { return null }
    },

    'getResponseHeader': function getResponseHeader(name) {
	return this.transport.getResponseHeader(name);
    },

    'getAllResponseHeaders': function getAllResponseHeaders() {
	return this.transport.getAllResponseHeaders();
    },

    '_getHeaderJSON': function _getHeaderJSON() {
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

    '_getResponseJSON': function _getResponseJSON() {
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

    $B({'Protopy': Protopy, 'Template': Template, 'Try': Try, 'Ajax':Ajax});
})();

//More Data types
(function(){
    var Dict = type('Dict', [object], {
        '__init__': function __init__(object) {
            this._value = {};
            this._key = {};
            if (!object || (type(object) == Array && !bool(object))) return;
            if (object instanceof Dict) {
                this._value = extend({}, object._value);
                this._key = extend({}, object._key);
            } else if (callable(object['next'])) {
                for each (var [key, value] in object)
                    this.set(key, value);
            } else if (type(object) == Array && type(object[0]) == Array) {
                for each (var [key, value] in object)
                    this.set(key, value);
            } else if (object instanceof Object){
                for (var key in object)
                    this.set(key, object[key]);
            }
        },

        '__iter__': function __iter__() {
            for each (var hash in this._value) {
                var value = this._value[hash], key = this._key[hash];
                var pair = [key, value];
                pair.key = key;
                pair.value = value;
                yield pair;
            }
        },

        '__copy__': function __copy__() {
            return new Dict(this);
        },

        'size': function size() {
            return keys(this._key).length;
        },

        'set': function set(key, value) {
            var hash = id(key);
            this._key[hash] = key;
            return this._value[hash] = value;
        },

        'setdefault': function setdefault(key, value){
            var ret = this.get(key);
            if (ret) return ret;
            return this.set(key, value);

        },

        'get': function get(key, otherwise) {
            var hash = id(key);
            var value = this._value[hash];
            if (value)
                return value;
            else otherwise
                return otherwise;
        },

        'unset': function unset(key) {
            var hash = id(key);
            var value = this._value[hash];
            delete this._value[hash];
            delete this._key[hash];
            return value;
        },

        'to_object': function to_object() {
            return create(this.to_array());
        },

        'keys': function keys() {
            return [k for each (k in this._key)];
        },

        values: function () {
            return [v for each (v in this._value)];
        },

        'to_array': function to_array() {
            return zip(this.keys(), this.values());
        },

        'items': function items() {
            return this.to_array();
        },

        'index': function index(value) {
            var match = this.detect(function(pair) {
                return pair.value === value;
            });
            return match && match.key;
        },

        'update': function update(object) {
            for (var hash in object._key)
                this.set(object._key[hash], object._value[hash]);
        },

        'inspect': function inspect() {
            return '#<Dict:{' + this.map(function(pair) {
                return pair.map(inspect).join(': ');
            }).join(', ') + '}>';
        },

        'to_JSON': function to_JSON() {
            return to_JSON(this.to_object());
        },

        'pop': function pop(key) {
            var val = this.unset(key);
            if (isundefined(val))
                throw new KeyError(key);
            return val;
        },

        'popitem': function popitem() {
            var val = this.unset(key);
            if (isundefined(val))
                throw new KeyError(key);
            return [key, val];
        },

        'clear': function clear() {
            this._value = {};
            this._key = {};
        },

        'has_key': function has_key(key) {
            var hash = id(key);
            return hash in this._key;
        }
    });

    var Set = type('Set', [object], {
        '__init__': function __init__(elements){
            var elements = elements || [];
            if (type(elements) != Array)
                throw new TypeError(elements + ' object is not array');
            this.elements = unique(elements);
        },

        get length(){
            return this.elements.length;
        },

        '__contains__': function __contains__(element){
            return include(this.elements, element);
        },

        '__nonzero__': function __nonzero__(){
            return bool(this.elements);
        },

        '__len__': function __len__() {
            return len(this.elements);
        },

        '__eq__': function __eq__(set) {
            return true;
        },

        '__ne__': function __ne__(set) {
            return true;
        },

        '__copy__': function __copy__(){
            return this.copy();
        },

        '__deepcopy__': function __deepcopy__(){
            return new Set(this.elements.__deepcopy__());
        },

        '__iter__': function __iter__() {
            for each (var element in this.elements)
                yield element;
        },

        'add': function add(element) {
          if (!include(this.elements, element))
              this.elements.push(element);
        },

        'remove': function remove(element){
          var index = this.elements.indexOf(element);
          if (index == -1)
              throw new KeyError(element);
          return this.elements.splice(index, 1)[0];
        },

        'discard': function discard(element){
          try {
              return this.remove(element);
          } catch (e if e instanceof KeyError) {
              return null;
          }
        },

        'pop': function pop(){
            return this.elements.pop();
        },

        'update': function update(set){
            var elements = (type(set) == Array)? set : set.elements;
            this.elements = unique(this.elements.concat(elements));
        },

        'union': function union(set){
            var elements = (type(set) == Array)? set : set.elements;
            return new Set(this.elements.concat(elements));
        },

        'intersection': function intersection(set){
            return new Set(this.elements.filter(function(e) { return include(set, e); }));
        },

        'intersection_update':  function(set){
            this.elements = this.elements.filter(function(e) { return include(set, e); });
        },

        'issubset': function issubset(set){
            if (this.length > set.length) return false;
            return this.elements.map(function(e){ return include(set, e) }).every(function(x){ return x });
        },

        'issuperset': function issuperset(set){
            if (this.length < set.length) return false;
            return set.elements.map(function(e){ return include(this, e) }, this).every(function(x){ return x });
        },

        'clear': function clear(){
            return this.elements.clear();
        },

        'copy': function copy(){
            return new Set(this.elements);
        },

        'difference': function difference(set){
            return new Set(this.elements.filter(function(e) { return !include(set, e); }));
        },

        'difference_update': function difference_update(set){
            this.elements = this.elements.filter(function(e) { return !include(set, e); });
        },

        'symmetric_difference': function symmetric_difference(set){
            var set = this.difference(set);
            return set.difference(this);
        },

        'symmetric_difference_update': function symmetric_difference_update(set){
            var set = this.difference(set);
            this.elements = set.difference(this).elements;
        }
    });
    
    $B({'Dict': Dict, 'Set': Set});
})();