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
    object.__type__ = type;
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
	this.prototype.__noSuchMethod__ = function(name, args) { throw new AttributeError(this.__name__ + ' object has no attribute ' + name); };
	this.prototype.constructor = this;
	this.prototype.__type__ = this;
    };
    object.__bases__ = [];
    object.__subclasses__ = [];
    object.__doc__ = "";

    //For de Instance
    object.prototype.__init__ = function __init__(){};
    object.prototype.__doc__ = "";
    object.prototype.__hash__ = function __hash__(){ return 1234567; };
    object.prototype.__str__ = function __str__(){ return this.__module__ + '.' + this.__name__ };

    // Type constructor
    function type() {
	var args = Array.prototype.slice.call(arguments);
	if (args.length < 1) 
	    throw new TypeError('Invalid arguments');
	if (!(args[0] instanceof String) && args.length == 1) 
	    return args[0].constructor;
	else var name = args.shift();
	if (args[0] instanceof Array && args[0][0] != undefined)
	    var bases = args.shift();
	else if (!(args[0] instanceof Array) && args[0] instanceof Function)
	    var bases = [args.shift()];
	else var bases = [object];
	if (args[0] instanceof Object && args.length == 2) {
	    var typeAttrs = args.shift();
	    var instanceAttrs = args.shift();
	} else if (args.length == 1) {
	    var typeAttrs = {};
	    var instanceAttrs = args.shift();
	} else if (args.length == 0) {
	    var typeAttrs = {};
	    var instanceAttrs = {};
	} else new TypeError('Invalid arguments');

	var new_type = eval('(function ' + name + '() { this.__init__.apply(this, arguments); })');
	
	//Decorando los atributos 
	typeAttrs['__name__'] = instanceAttrs['__name__'] = name;
	typeAttrs['__module__'] = instanceAttrs['__module__'] = this['__name__'];

	//Jerarquia
	new_type.__bases__ = bases;
	new_type.__subclasses__ = [];
	for each (var base in bases.reverse()) {
	    base.__subclasses__.push(new_type);
	    new_type.__new__ = base.__new__;
	}
	
	//Construyendo el tipo
	new_type.__new__ = new_type.__new__ || object.__new__;
	for (var name in typeAttrs)
	    __extend__(true, new_type, typeAttrs);

	new_type.__noSuchMethod__ = function(name, args) { throw new AttributeError(this.__name__ + ' type has no attribute ' + name); };

	//Constructor de instancia
	new_type.__new__(name, bases, instanceAttrs);
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
    'extend': function extend() {return __extend__.apply(this, [false].concat(array(arguments)));},
    'ls': function ls(obj){ return keys(__modules__[(obj && obj['__name__']) || this['__name__']]); },
	'locals': function locals(){ return __modules__[this['__name__']]; },
	'globals': function globals(){ return __modules__['__main__']; }
    });
})();

// More builtins functions and types
(function(){
    function super(type, object) {
	//TODO: Validar que sea una instancia a subclase del tipo dado
	var obj = {};
	var base = (object.constructor == Function)? type : type.prototype;
	var object = object;
	obj.__noSuchMethod__ = function(name, args) {
	    if (args[args.length - 1] && args[args.length - 1] instanceof Arguments)
            return base[name].apply(object, args.slice(0, -1).concat(args[args.length -1].argskwargs));
        else
            return base[name].apply(object, args);
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

    //Arguments wraped and whit esteroids
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
            for (var p in this._defaults || {})
                this._kwargs[p] = this._defaults[p];
            if (this.collect[this.collect.length - 1] instanceof Object) {
                var object = this.collect[this.collect.length - 1];
                for (var p in object)
                    this._kwargs[p] = object[p];
            }
            if (this.names.length < this.collect.length)
                this._args = this.collect.slice(this.names.length, (!this._kwargs)? this.collect.length : this.collect.length - 1);
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
    
    //Populate builtin
    $B({
        'super': super,
        'isinstance': isinstance,
        'issubclass': issubclass,
        'Arguments': Arguments,
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
                        } else if (isarray(object)) {
                            return object.length != 0;
                        } else {
                            return keys(object).length != 0;
                        }
                }
            }
            throw new TypeError("object of type '" + typeof(object) + "' has no bool()");
        },
	'callable': function callable(object) {return object && type(object) == Function;},
        'chr': function chr(number){ 
            if (!isnumber(number)) throw new TypeError('An integer is required');
            return String.fromCharCode(number); },
        'bisect': function bisect(array, element) {
            var i = 0;
            for (var length = array.length; i < length; i++)
                if (array[i].__cmp__(element) > 0) return i;
            return i;
        },
        'dict': function dict(object){ return new Dict(object) },
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
                        if (callable(object['__len__'])) {
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
        'array': function array(iterable) {
            if (!iterable) return [];
            if (iterable.to_array) return iterable.to_array();
            if (callable(iterable['__iterator__'])) return [e for each (e in iterable)];
            if (callable(iterable['next'])) {
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
        'mult': function mult(array, value) {
            var result = [];
            for (var i = 0; i < value; i++)
                result = result.concat(array);
            return result;
        },
        'ord': function(Ascii){ return Ascii.charCodeAt(0); },
        'print': function print() {
            if (window.console != undefined && window.console.log != undefined)
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
            if (object['__str__'] != undefined) return object.__str__();
            return String(object)
        },
        'values': function keys(obj){ return [e for each (e in obj)] },
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
	bind: function() {
	    if (arguments.length < 2 && (!arguments[0])) return this;
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
	    count = (!count) ? 1 : count;

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
	    if (args[0] && type(args[0]) == Object)
		string = new Template(string, args[1]).evaluate(args[0]);
	    else
		string = string.gsub(/%s/, function(match) { return (args.length != 0)? str(args.shift()) : match[0]; });
	    return string.gsub(/<ESC%%>/, function(match){ return '%'; });
	},

	truncate: function(length, truncation) {
	    length = length || 30;
	    truncation = (!truncation) ? '...' : truncation;
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
    __init__: function(template, pattern) {
	this.template = str(template);
	this.pattern = pattern || Template.Pattern;
    },

    evaluate: function(object) {
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
	    return returnValue; } 
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
	    if (callable(responder[callback])) {
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

    Ajax.Base = type('Base', {
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

	    if (type(this.options.parameters) == String)
	    this.options.parameters = this.options.parameters.to_query_params();
	}
    });

    Ajax.Request = type('Request', Ajax.Base, {
	_complete: false,

	__init__: function(url, options) {
	    super(Ajax.Base, this).__init__(options);
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

	    if (callable(extras.push))
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

    Ajax.Request.Events = ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

    Ajax.Response = type('Response', {
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
	this.responseXML  = (!xml) ? null : xml;
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

    $B({'Protopy': Protopy, 'Template': Template, 'Try': Try, 'Ajax':Ajax});
})();