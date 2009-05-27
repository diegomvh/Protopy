//******************************* PROTOPY CORE *************************************//
(function() {
    /* Copia sobre destiny todos los objetos pasados como argumento.
     * si safe == false los atribuotos de la forma __<foo>__ no se copian al objeto destino
     */
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
	    if (back_iter)
		object['__iterator__'] = back_iter;
	}
	return destiny;
    }

    /* Copia en this todos los atribuos del objeto pasado como argumento
     */
    function publish(object) {
        __extend__(false, this, object);
    }

    /* Administrador de modulos, encargado de la creacion, almacenamiento y otras tareas referidas a los modulos
     */
    var ModuleManager = {
	modules: {},
	modules_dict: {},
	paths: {},
	module_functions: {
	    publish: publish,
	    require: require,
	    type: type
	},
	base: '/', //Where i'm, set this for another place. Default root 
	default_path: 'packages',
	add: function(module) {
	    var name = module['__name__'];
	    this.modules[name] = module;
	},
	remove: function(module) {
	    var name = module['__name__'];
	    delete this.modules[name];
	},
	create: function(name, file, source) {
	    var module = this.modules_dict;
	    for each (var n in name.split('.')) {
		module = module[n] || (module[n] = new Object());
	    }
	    module['__file__'] = file;
	    module['__name__'] = name;
	    if (source)
		__extend__(true, module, source);
	    return module;
	},
	decorate: function(module) {
	    return __extend__(false, module, this.module_functions);
	},
	clean: function(module) {
	    for (var f in this.module_functions)
		delete module[f];
	    return module;
	},
	get: function(name) {
	    return this.modules[name] || null;
	},
	register_path: function(name, path) {
	    assert(name.lastIndexOf('.') == -1, 'The module name should be whitout dots');
	    assert(!this.paths[name], 'The module is registered');
	    path = path.split('/').filter( function (e) { return e; });
	    if (!bool(path)) {throw new TypeError('where is the path?')}
	    this.paths[name] = path.join('/');
	},
	file: function(name) {
	    if (isinstance(name, String)) {
		var index = name.lastIndexOf('.');
		var [ pkg, filename ] = (index != -1)? [ name.slice(0, index), name.slice(index + 1)] : [ '', name];
		return this.module_url(pkg, filename + '.js');
	    } else if (isinstance(name, Object) && name['__file__'])
		return name['__file__'];
	    else throw new TypeError('Invalid Argument');
	},
	module_url: function(name, postfix) {
	    var url = name.split('.');
	    if (this.paths[url[0]]) {
		url = this.paths[url[0]].split('/').concat(url.slice(1));
	    } else {
		url = this.default_path.split('/').concat(url);
	    }
	    
	    if (postfix)
		url = url.concat(postfix.split('/'));
	    url = url.filter( function (element) { return element; });
	    return this.base + url.join('/');
	}
    };

    /* Funcion "cargadora" de modulos, carga en this el modulo requerido, 
     * o solo los simbolos de un modulo si mas argumentos son pasados a esta funcion.
     */
    function require(name) {
        var mod = ModuleManager.get(name);
        if (!mod) {
            //Only firefox and synchronous, sorry
	    var file = ModuleManager.file(name);
            var code = null,
		request = new XMLHttpRequest();
            request.open('GET', file, false); 
            request.send(null);
            if(request.status != 200)
		throw new LoadError(file);
            //Tego el codigo, creo el modulo
	    var code = '(function(){ ' + request.responseText + '});';
            mod = ModuleManager.create(name, file);
            mod = ModuleManager.decorate(mod);
            ModuleManager.add(mod);
	    //The base module are ready, publish the event
	    event.publish('onModuleCreated', [this, mod]);
            try {
		with (mod) {
		    eval(code).call(mod);
		}
	    } catch (e) {
		ModuleManager.remove(mod);
		throw e;
	    }
	    //Not clean for lazy require support
            //mod = ModuleManager.clean(mod);
        }
        event.publish('onModuleLoaded', [this, mod]);
        switch (arguments.length) {
            case 1:
                    // Returns module
		    var names = name.split('.');
                    var last = names[names.length - 1];
                    this[last] = mod;
                    return mod;
            case 2:
                    // If all contents were requested returns nothing
                    if (arguments[1] == '*') {
                        __extend__(false, this, mod);
                        return;
                    // second arguments is the symbol in the package
                    } else {
                        var n = arguments[1];
                        this[n] = mod[n];
                        return mod[n];
                    }
            default:
                    // every argyment but the first one are a symbol
                    // returns nothing
                    for (var i = 1, length = arguments.length; i < length; i++) {
                        this[arguments[i]] = mod[arguments[i]];
                    }
                    return;
        }
    }
    
    /************************** Types and Objects ****************************/
    /* Base te todos los objetos que crea protopy */
    function object() { 
	throw 'The wormhole stop here. Please, is just javascript not python :)'; 
    };

    //Static
    object.__class__ = type;
    object.__new__ = function(name, bases, attrs) {
        //Herencia
        var superbase = function() {};
        superbase.prototype = {};
        for each (var base in bases.reverse()) {
            __extend__(true, superbase.prototype, base.prototype);
        }
        this.prototype.__proto__ = superbase.prototype;

        __extend__(true, this.prototype, attrs);

        // Decorate javascript
        this.prototype.toString = this.prototype.__str__;
        if (this.prototype.__iter__)
            this.prototype.__iterator__ = this.prototype.__iter__;
        this.prototype.constructor = this;
        this.prototype.__class__ = this;
        return this;
    };
    object.__base__ = null;
    object.__bases__ = [];
    object.__subclasses__ = [];
    object.__static__ = {};

    //Prototype
    object.prototype.__init__ = function __init__(){};
    object.prototype.__str__ = function __str__(){ return this['__module__'] + '.' + this['__name__'] };

    // Constructor de tipos o clases
    function type(name) {
	if (isundefined(name))
	    throw new TypeError('Invalid arguments');
	var args = Array.prototype.slice.call(arguments).slice(1);
	if (args.length == 0) {
	    if (name === null) return Object;
	    return name.constructor;
	}
	if (isinstance(args[0], Array) && args[0].length > 0)
	    var bases = args.shift();
	else if (!isinstance(args[0], Array) && isinstance(args[0], Function))
	    var bases = [args.shift()];
	else 
	    throw new TypeError('Invalid arguments, bases?');
	if (isinstance(args[0], Object) && args.length == 2) {
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
	new_type.__static__ = {};
	for each (var base in bases.reverse()) {
	    base.__subclasses__.push(new_type);
	    __extend__(true, new_type.__static__, base.__static__);
	    new_type.__new__ = base.__new__;
	}

	//Decorando los atributos
	classAttrs['__name__'] = instanceAttrs['__name__'] = name;
	classAttrs['__module__'] = instanceAttrs['__module__'] = this['__name__'] || 'window';

	//Construyendo el tipo
        __extend__(true, new_type.__static__, classAttrs);
	__extend__(true, new_type, new_type.__static__);

	//Constructor de instancia
	new_type = new_type.__new__(new_type.__name__, new_type.__bases__, instanceAttrs);
	return new_type;
    }
    
    // ******************************* MODULES ************************************* //

    /******************** sys ***********************/
    /* Retorna el objeto gears, de no existir lo crea en window.google.gears */
    function get_gears(){
	var factory;
	
	if (window.google && window.google.gears) { return window.google.gears; } // already defined elsewhere
	
	if(typeof GearsFactory != "undefined"){ // Firefox
		factory = new GearsFactory();
	}else{
		if(sys.browser.IE){
			try{
				factory = new ActiveXObject("Gears.Factory");
			}catch(e){
				// ok to squelch; there's no gears factory.  move on.
			}
		}else if(navigator.mimeTypes["application/x-googlegears"]){
			// Safari?
			factory = document.createElement("object");
			factory.setAttribute("type", "application/x-googlegears");
			factory.setAttribute("width", 0);
			factory.setAttribute("height", 0);
			factory.style.display = "none";
			document.documentElement.appendChild(factory);
		}
	}

	if(!factory){ return null; }
	
	window.google = {}, window.google.gears = {}, window.google.gears.factory = factory;
	return window.google.gears;
    }
    /* Modulo: sys - modulo de sistema, proporciona informacion sobre el ambiente y algunas herramientas para interactuar con este */
    var sys = ModuleManager.create('sys', 'built-in', { 
	version: 0.1,
	browser: {
	    IE:     !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
	    Opera:  navigator.userAgent.indexOf('Opera') > -1,
	    WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
	    Gecko:  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1,
	    MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/),
	    features: {
		XPath: !!document.evaluate,
		SelectorsAPI: !!document.querySelector,
		ElementExtensions: !!window.HTMLElement,
		SpecificElementExtensions: document.createElement('div')['__proto__'] &&
						document.createElement('div')['__proto__'] !==
						document.createElement('form')['__proto__']
	    }
	},
	get_gears: get_gears,
	register_path: function(module, path) { 
	    ModuleManager.register_path(module, path); 
	},
	module_url: function(name, postfix) {
	    return ModuleManager.module_url(name, postfix);
	},
	modules: ModuleManager.modules,
	paths: ModuleManager.paths
    });

    sys.browser.features.Gears = !!get_gears() || false;

    /******************** exception ***********************/
    /* Modulo: exception, clases o tipos de excepciones que preovee protopy */ 
    var Exception = type('Exception', [ object ], {
        __init__: function(message) {
            //TODO: Ver como tomar mas informacion de quien larga la exception
            //this.caller = arguments.callee.caller;
            this.args = arguments;
            this.message = (message && type(message) == String)? message : '';
        },
        __str__: function() { return this.__name__ + ': ' + this.message; }
    });
    
    var exception = ModuleManager.create('exceptions', 'built-in', {
        Exception: Exception,
        AssertionError: type('AssertionError', Exception),
        AttributeError: type('AttributeError', Exception),
        LoadError:  type('LoadError', Exception),
        KeyError:  type('KeyError', Exception),
        NotImplementedError:  type('NotImplementedError', Exception),
        TypeError:  type('TypeError', Exception),
        ValueError:  type('ValueError', Exception),
    });

    /********************** event **************************/
    // From dojo
    var Listener = {
	// create a dispatcher function
 	get_dispatcher: function() {
	    return function() {
		var callee = arguments.callee, listeners = callee._listeners, target = callee.target;
		// return value comes from original target function
		var ret = target && target.apply(this, arguments);
		// invoke listeners after target function
		for each (var listener in listeners)
		    listener.apply(this, arguments);
		// return value comes from original target function
		return ret;
	    }
	},
	// add a listener to an object
	add: function(source, method, listener) {
	    source = source || window;
	    // The source method is either null, a dispatcher, or some other function
	    var func = source[method];
	    // Ensure a dispatcher
	    if(!func || !func._listeners) {
		var dispatcher = this.get_dispatcher();
		// original target function is special
		dispatcher.target = func;
		// dispatcher holds a list of listeners
		dispatcher._listeners = []; 
		// redirect source to dispatcher
		func = source[method] = dispatcher;
	    }
	    return func._listeners.push(listener) ;
	},
	// remove a listener from an object
	remove: function(source, method, handle) {
	    var func = ( source || window )[method];
	    // remember that handle is the index+1 (0 is not a valid handle)
	    if(func && func._listeners && handle--) {
		delete func._listeners[handle]; 
	    }
	}
    };

    var EventListener = {
	add: function(node, name, fp) {
	    if(!node)
		return; 
	    name = this._normalize_event_name(name);
	    fp = this._fix_callback(name, fp);
	    var oname = name;
	    if(!sys.browser.IE && (name == "mouseenter" || name == "mouseleave")) {
		var ofp = fp;
		//oname = name;
		name = (name == "mouseenter") ? "mouseover" : "mouseout";
		fp = function(e) {
		    // thanks ben!
		    //if(!dojo.isDescendant(e.relatedTarget, node)){
		    // e.type = oname; // FIXME: doesn't take? SJM: event.type is generally immutable.
			return ofp.call(this, e); 
		   // }
		}
	    }
	    node.addEventListener(name, fp, false);
	    return fp; /*Handle*/
	},
	remove: function(node, event, handle) {
	    if (node)
		node.removeEventListener(this._normalize_event_name(event), handle, false);
	},
	_normalize_event_name: function(name) {
	    // Generally, name should be lower case, unless it is special
	    // somehow (e.g. a Mozilla DOM event).
	    // Remove 'on'.
	    return name.slice(0,2) =="on" ? name.slice(2) : name;
	},
	_fix_callback: function(name, fp) {
	    // By default, we only invoke _fixEvent for 'keypress'
	    // If code is added to _fix_event for other events, we have
	    // to revisit this optimization.
	    // This also applies to _fix_event overrides for Safari and Opera
	    // below.
	    return name != "keypress" ? fp : function(e) { return fp.call(this, this._fix_event(e, this)); };
	},
	_fix_event: function(evt, sender){
	    // _fix_callback only attaches us to keypress.
	    // Switch on evt.type anyway because we might 
	    // be called directly from dojo.fixEvent.
	    switch(evt.type){
		    case "keypress":
			    this._set_key_char(evt);
			    break;
	    }
	    return evt;
	},
	_set_key_char: function(evt){
	    //FIXME: Esto no va o no esta o es un desastre
	    evt.keyChar = evt.charCode ? String.fromCharCode(evt.charCode) : '';
	}
    };

    var Topics = {};

    function _connect(obj, event, context, method) {
	// FIXME: need a more strict test
	var isNode = obj && (obj.nodeType || obj.attachEvent || obj.addEventListener);
	// choose one of three listener options: raw (connect.js), DOM event on a Node, custom event on a Node
	// we need the third option to provide leak prevention on broken browsers (IE)
	var lid = !isNode ? 0 : 1, l = [Listener, EventListener][lid];
	// create a listener
	var h = l.add(obj, event, isinstance(method, String)? getattr(context, method) : method);
	// formerly, the disconnect package contained "l" directly, but if client code
	// leaks the disconnect package (by connecting it to a node), referencing "l" 
	// compounds the problem.
	// instead we return a listener id, which requires custom _disconnect below.
	// return disconnect package
	return [ obj, event, h, lid ];
    }
    
    function _disconnect(obj, event, handle, listener) {
        ([Listener, EventListener][listener]).remove(obj, event, handle);
    }

    var event = ModuleManager.create('event', 'built-in', {
        connect: function(obj, event, context, method) {
	    var a = arguments, args = [], i = 0;
	    // if a[0] is a String, obj was ommited
	    args.push(isinstance(a[0], String) ? null : a[i++], a[i++]);
	    // if the arg-after-next is a String or Function, context was NOT omitted
	    var a1 = a[i+1];
	    args.push((a1 && isinstance(a1, String)) || callable(a1) ? a[i++] : null, a[i++]);
	    // absorb any additional arguments
	    for (var l = a.length; i < l; i++) 
		args.push(a[i]);
	    // do the actual work
	    return _connect.apply(this, args); /*Handle*/
	},
        disconnect: function(handle) {
	    if(handle && typeof(handle[0]) !== 'undefined') {
		_disconnect.apply(this, handle);
		// let's not keep this reference
		delete handle[0];
	    }
	},
        subscribe: function(topic, context, method) {
	    return [topic, Listener.add(Topics, topic, (method && isinstance(method, String))? getattr(context, method) : context)];
	},
        unsubscribe: function(handle) {
	    if(handle)
		Listener.remove(Topics, handle[0], handle[1]);
	},
        publish: function(topic, args) {
	    var func = Topics[topic];
	    if(func)
		func.apply(this, args || []);
	},
        connectpublisher: function(topic, obj, event) {
	    var pf = function() { 
		this.publish(topic, arguments); 
	    }
	    return (event) ? this.connect(obj, event, pf) : this.connect(obj, pf); //Handle
	},
        fixevent: function(){},
        stopevent: function(){},
	keys: { BACKSPACE: 8, TAB: 9, CLEAR: 12, ENTER: 13, SHIFT: 16, CTRL: 17, ALT: 18, PAUSE: 19, CAPS_LOCK: 20, 
		    ESCAPE: 27, SPACE: 32, PAGE_UP: 33, PAGE_DOWN: 34, END: 35, HOME: 36, LEFT_ARROW: 37, UP_ARROW: 38,
		    RIGHT_ARROW: 39, DOWN_ARROW: 40, INSERT: 45, DELETE: 46, HELP: 47, LEFT_WINDOW: 91, RIGHT_WINDOW: 92,
		    SELECT: 93, NUMPAD_0: 96, NUMPAD_1: 97, NUMPAD_2: 98, NUMPAD_3: 99, NUMPAD_4: 100, NUMPAD_5: 101,
		    NUMPAD_6: 102, NUMPAD_7: 103, NUMPAD_8: 104, NUMPAD_9: 105, NUMPAD_MULTIPLY: 106, NUMPAD_PLUS: 107,
		    NUMPAD_ENTER: 108, NUMPAD_MINUS: 109, NUMPAD_PERIOD: 110, NUMPAD_DIVIDE: 111, F1: 112, F2: 113, F3: 114,
		    F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123, F13: 124, 
		    F14: 125, F15: 126, NUM_LOCK: 144, SCROLL_LOCK: 145 }
    });

    /******************** timer **************************/
    var timer = ModuleManager.create('timer', 'built-in', {
	setTimeout: window.setTimeout,
	setInterval: window.setInterval,
	clearTimeout: window.clearTimeout,
	delay: function(f) {
	    var __method = f, args = array(arguments).slice(1), timeout = args.shift() * 1000;
	    return window.setTimeout(function() { return _method.apply(_method, args); }, timeout);
	},
	defer: function(f) {
	    var args = [0.01].concat(array(arguments).slice(1));
	    return this.delay(f, args);
	}
    });

    /******************** ajax **************************/
    var activeRequestCount = 0;

    var Responders = {
	responders: [],
	register: function(responder) {
	    if (this.responders.indexOf(responder) != -1)
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

    Responders.register({
        onCreate: function() { activeRequestCount++ },
        onComplete: function() { activeRequestCount-- }
    });

    //TODO: armar algo para podes pasar parametros.
    var Base = type('Base', object, {
	__init__: function(options) {
	    this.options = {
		method:       'post',
		asynchronous: true,
		contentType:  'application/x-www-form-urlencoded',
		encoding:     'UTF-8',
		parameters:   ''
	    };
	    extend(this.options, options || { });

	    this.options.method = this.options.method.toLowerCase();

	    if (type(this.options.parameters) == String)
		this.options.parameters = ajax.toQueryParams(this.options.parameters);
	}
    });

    var Request = type('Request', [ Base ], {
	_complete: false,
	__init__: function(url, options) {
	    super(Base, this).__init__(options);
	    this.transport = new XMLHttpRequest();
	    this.request(url);
	},
	request: function(url) {
	    this.url = url;
	    this.method = this.options.method;
	    var params = extend({}, this.options.parameters);

	    if (['get', 'post'].indexOf(this.method) == -1) {
		// simulate other verbs over post
		params['_method'] = this.method;
		this.method = 'post';
	    }

	    this.parameters = params;

	    try {
		var response = new Response(this);
		if (this.options.onCreate) this.options.onCreate(response);
		    Responders.dispatch('onCreate', this, response);

		this.transport.open(this.method.toUpperCase(), this.url, this.options.asynchronous);

		if (this.options.asynchronous)
		    timer.defer(getattr(this, 'respondToReadyState'), 1);

		this.transport.onreadystatechange = getattr(this, 'onStateChange');
		this.setRequestHeaders();

		this.body = this.method == 'post' ? this.serialize(this.options.postBody || params) : null;
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
		'X-Protopy-Version': sys.version,
		'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
	    };

	    if (this.method == 'post') {
		headers['Content-type'] = this.options.contentType + (this.options.encoding ? '; charset=' + this.options.encoding : '');

	    /* Force "Connection: close" for older Mozilla browsers to work
	    * around a bug where XMLHttpRequest sends an incorrect
	    * Content-length header. See Mozilla Bugzilla #246651.
	    */
	    if (this.transport.overrideMimeType &&
		(navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
		    headers['Connection'] = 'close';
	    }

	    // user-defined headers
	    if (this.options.requestHeaders && type(this.options.requestHeaders) == Object)
		var extras = this.options.requestHeaders;

	    if (extras && type(extras.push) == Function)
		for (var i = 0, length = extras.length; i < length; i += 2)
		    headers[extras[i]] = extras[i+1];
	    
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
	    var state = Request.Events[readyState], response = new Response(this);

	    if (state == 'Complete') {
		try {
		    this._complete = true;
		    (this.options['on' + response.status]
		    || this.options['on' + (this.success() ? 'Success' : 'Failure')]
		    || function(){})(response);
		} catch (e) {
		    this.dispatchException(e);
		}

		var contentType = response.getHeader('Content-type');
	    }
	    try {
		(this.options['on' + state] || function(){})(response);
		Responders.dispatch('on' + state, this, response);
	    } catch (e) {
		this.dispatchException(e);
	    }

	    if (state == 'Complete') {
	    // avoid memory leak in MSIE: clean up
		this.transport.onreadystatechange = function(){};
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

	'dispatchException': function dispatchException(exception) {
	    (this.options.onException || function(){})(this, exception);
	    Responders.dispatch('onException', this, exception);
	}
    });

    Request.Events = ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

    var Response = type('Response', [ object ], {
	'__init__': function __init__(request){
	    this.request = request;
	    var transport  = this.transport  = request.transport,
		readyState = this.readyState = transport.readyState;

	    if((readyState > 2 && !sys.browser.IE) || readyState == 4) {
		this.status       = this.getStatus();
		this.statusText   = this.getStatusText();
		this.responseText = String.interpret(transport.responseText);
	    }

	    if(readyState == 4) {
		var xml = transport.responseXML;
		this.responseXML  = (!xml) ? null : xml;
	    }
	},

	status:      0,
	statusText: '',

	getStatus: Request.prototype.getStatus,

	'getStatusText': function getStatusText() {
	    try {
		return this.transport.statusText || '';
	    } catch (e) { return '' }
	},

	getHeader: Request.prototype.getHeader,

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
	}
    });

    var ajax = ModuleManager.create('ajax', 'built-in', {
	Request: Request,
	Response: Response,
	toQueryParams: function(string, separator) {
	    var match = string.match(/([^?#]*)(#.*)?$/);
	    if (!match) return { };

	    return match[1].split(separator || '&').reduce(function(hash, pair) {
	    if ((pair = pair.split('='))[0]) {
		var key = decodeURIComponent(pair.shift());
		var value = pair.length > 1 ? pair.join('=') : pair[0];
		if (value != undefined) value = decodeURIComponent(value);

		if (key in hash) {
		    if (type(hash[key]) != Array) hash[key] = [hash[key]];
		    hash[key].push(value);
		} else hash[key] = value;
	    }
	    return hash;
	    }, {});
	},
	toQueryString: function(params) {
	    if(!(isinstance(params, Object) || isinstance(params, Array)) || isinstance(params, Date))
		throw new Exception('You must supply either an array or object type to convert into a query string. You supplied: ' + type(params));
	    var str = '';
	    var useHasOwn = {}.hasOwnProperty ? true : false;
	    for (var key in params){
		if(useHasOwn && params.hasOwnProperty(key)){
		    //Process an array
		    if(isinstance(params[key], Array)){
			for(var i = 0; i < params[key].length; i++) {
			    if(str) str += '&';
			    str += encodeURIComponent(key) + "=";
			    if(params[key][i] instanceof Date)
				str += encodeURIComponent(params[key][i].toISO8601());
			    else if(isinstance(params[key][i], Object))
				    throw Error('Unable to pass nested arrays nor objects as parameters while in making a cross-site request. The object in question has this constructor: ' + params[key][i].constructor);
				else str += encodeURIComponent(String(params[key][i]));
			}
		    } else {
			if(str) str += '&';
			str += encodeURIComponent(key) + "=";
			if(params[key] instanceof Date)
			    str += encodeURIComponent(rpc.dateToISO8601(params[key]));
			else if(params[key] instanceof Object)
			    throw Error('Unable to pass objects as parameters while in making a cross-site request. The object in question has this constructor: ' + params[key].constructor);
			else str += encodeURIComponent(String(params[key]));
		    }
		}
	    }
	    return str;
	}
    });

    /******************** dom **************************/
    //Based on peppy
    var doc = document;
    var cache = {};
    var cacheOn = !sys.IE && !sys.WebKit;
    var persistCache = {};
    var _uid = 0;
	
    var reg = {
	trim : /^\s+|\s+$/g,
	quickTest : /^[^:\[>+~ ,]+$/,
	typeSelector : /(^[^\[:]+?)(?:\[|\:|$)/,
	tag : /^(\w+|\*)/,		
	id : /^(\w*|\*)#/,
	classRE : /^(\w*|\*)\./,
	attributeName : /(\w+)(?:[!+~*\^$|=])|\w+/,
	attributeValue : /(?:[!+~*\^$|=]=*)(.+)(?:\])/, 
	pseudoName :  /(\:[^\(]+)/,
	pseudoArgs : /(?:\()(.+)(?:\))/,				
	nthParts : /([+-]?\d)*(n)([+-]\d+)*/i,		
	combinatorTest : /[+>~ ](?![^\(]+\)|[^\[]+\])/,
	combinator :  /\s*[>~]\s*(?![=])|\s*\+\s*(?![0-9)])|\s+/g, 						
	recursive : /:(not|has)\((\w+|\*)?([#.](\w|\d)+)*(\:(\w|-)+(\([^\)]+\))?|\[[^\}]+\])*(\s*,\s*(\w+|\*)?([#.](\w|\d)+)*(\:(\w|-)+(\([^\)]+\))?|\[[^\}]+\])*)*\)/gi		
    }

    //TODO: hacer filter mas pythonnico y en builtins    
    // Filters a list of elements for uniqueness.
    function filter( a, tag ) {
	var r = [], 
	    uids = {};
	if( tag ) tag = new RegExp( "^" + tag + "$", "i" );
	for( var i = 0, ae; ae = a[ i++ ]; ) {
	    ae.uid = ae.uid || _uid++;
	    if( !uids[ae.uid] && (!tag || ae.nodeName.search( tag ) !== -1) ) {
		r[r.length] = uids[ae.uid] = ae;
	    }
	}
	return r;
    }
	
    // get_attribute - inspired by EXT -> http://extjs.com
    // Copyright(c) 2006-2008, Ext JS, LLC.
    // http://extjs.com/license
    function get_attribute( e, a ) {
	if( !e ) return null;
	if( a === "class" || a === "className" )
	    return e.className;
	if( a === "for" ) 
	    return e.htmlFor;	
	return e.getAttribute( a ) || e[a];
    }		
	
    function get_by_class( selector, selectorRE, root, includeRoot, cacheKey, tag, flat ) {
	var result = [];
	
	if( !!flat )
	    return selectorRE.test( root.className ) ? [root] : [];
	
	if( root.getElementsByClassName ) {
	    result = array( root.getElementsByClassName( selector) );			
	    
	    if( !!includeRoot ) {
		if( selectorRE.test( root.className ) ) 
		    result[ result.length ] = root;
	    }
	    
	    if( tag != "*" ) 
		result = filter( result, tag );
	    cache[ cacheKey ] = result.slice(0);
	    return result;

	} else if( doc.getElementsByClassName ) {
	    result = array( doc.getElementsByClassName( selector ) ); 
	    
	    if( tag != "*" ) 
		result = filter( result, tag );
	    cache[ cacheKey ] = result.slice(0);
	    return result;
	}
	
	var es = (tag == "*" && root.all) ? root.all : root.getElementsByTagName( tag );		
	
	if( !!includeRoot ) 
	    es[ es.length ] = root ;		
	
	for( var index = 0, e; e = es[ index++ ]; ) {
	    if( selectorRE.test( e.className ) ) {
		result[ result.length ] = e;
	    }
	}
	return result;
    }
	
    function get_by_id( selector, root, includeRoot, cacheKey, tag, flat ) {
	var rs, 
	    result = [];
	
	if( !!flat )
		return get_attribute( root, "id" ) === selector ? [root] : [];
	
	if( root.getElementById )
	    rs = root.getElementById( selector );
	else
	    rs = doc.getElementById( selector );
	
	if( rs && get_attribute( rs, "id" ) === selector ) {			
	    result[ result.length ] = rs;
	    cache[ cacheKey ] = result.slice(0);
	    return result;
	}
	
	var es = root.getElementsByTagName( tag );
	
	if( !!includeRoot ) 
	    es[ es.length ] = root ;
	
	for( var index = 0, e; e = es[ index++ ]; ) {
	    if( get_attribute( e, "id" ) === selector ) {
		result[ result.length ] = e;
		break;
	    }
	}
	return result;
    } 

    function get_context_from_sequence_selector( selector, roots, includeRoot, flat ) {
	var context, 
	    tag, 
	    contextType = "", 
	    result = [], 
	    tResult = [], 
	    root, 
	    rootCount, 
	    rootsLength;
	    
	reg.id.lastIndex = reg.typeSelector.lastIndex = reg.classRE.lastIndex = 0;
	if( !reg.tag.test( selector ) ) 
	    selector = "*" + selector;
	context = reg.typeSelector.exec( selector )[1];
	roots = roots instanceof Array ? roots.slice(0) : [roots];
	rootsLength = roots.length;
	rootCount = rootsLength - 1;

	if( reg.id.test( context ) ) {			
	    contextType = "id";
	    tag = (tag = context.match( /^\w+/ )) ? tag[0] : "*";
	    context = context.replace( reg.id, "");						
	} else if( reg.classRE.test( context ) ) {
	    contextType = "class";
	    tag = (tag = context.match( reg.tag )) ? tag[0] : "*";
	    context = context.replace( reg.tag, "" );
	    contextRE = persistCache[context + "RegExp"] || 
				    (persistCache[context + "RegExp"] = new RegExp( "(?:^|\\s)" + context.replace( /\./g, "\\s*" ) + "(?:\\s|$)" ));
	    context = context.replace( /\./g, " " )
	}			
	
	while( rootCount > -1 ) { 
	    root = roots[ rootCount-- ];
	    root.uid = root.uid || _uid++;
	    var cacheKey = selector + root.uid;
	    
	    if( cacheOn && cache[ cacheKey ] ) {
		result = result.concat( cache[ cacheKey ] );
		continue;
	    }
	    
	    if( contextType === "id" ) {
		tResult = get_by_id( context, root, includeRoot, cacheKey, tag, flat );
	    } else if( contextType === "class" ) {
		tResult = get_by_class( context, contextRE, root, includeRoot, cacheKey, tag, flat );
	    } else { /* tagname */
		tResult = array( root.getElementsByTagName( context ) );
		if( !!includeRoot && (root.nodeName.toUpperCase() === context.toUpperCase() || context === "*") ) 
		    tResult[tResult.length] = root;
	    }
	    
	    result = rootsLength > 1 ? result.concat( tResult ) : tResult;
	    cache[ cacheKey ] = result.slice(0);
	}
	return result;
    }
	
    function query( selectorGroups, root, includeRoot, recursed, flat ) {
	var elements = [];
	if( !recursed ) {  // TODO: try to clean this up. 
	    selectorGroups = selectorGroups.replace( reg.trim, "" ) // get rid of leading and trailing spaces 
		.replace( /(\[)\s+/g, "$1") // remove spaces around '['  of attributes
		.replace( /\s+(\])/g, "$1") // remove spaces around ']' of attributes
		.replace( /(\[[^\] ]+)\s+/g, "$1") // remove spaces to the left of operator inside of attributes
		.replace( /\s+([^ \[]+\])/g, "$1" ) // remove spaces to the right of operator inside of attributes
		.replace( /(\()\s+/g, "$1") // remove spaces around '(' of pseudos   
		.replace( /(\+)([^0-9])/g, "$1 $2") // add space after + combinator
		.replace( /['"]/g, "") // remove all quotations
		.replace( /\(\s*even\s*\)/gi, "(2n)") // replace (even) with (2n) - pseudo arg (for caching)
		.replace( /\(\s*odd\s*\)/gi, "(2n+1)"); // replace (odd) with (2n+1) - pseudo arg (for caching)
	}			
	    
	if( typeof root === "string" ) {
	    root = (root = get_context_from_sequence_selector( root, doc )).length > 0 ? root : undefined;
	}

	root = root || doc;
	root.uid = root.uid || _uid++;
	    
	var cacheKey = selectorGroups + root.uid;
	if( cacheOn && cache[ cacheKey ] ) 
	    return cache[ cacheKey ];
	    
	reg.quickTest.lastIndex = 0;
	if( reg.quickTest.test( selectorGroups ) ) {
	    elements = get_context_from_sequence_selector( selectorGroups, root, includeRoot, flat );
	    return (cache[ cacheKey ] = elements.slice(0));
	}
	    
	var groupsWorker, 
	    groups, 
	    selector, 
	    parts = [], 
	    part;
		
	groupsWorker = selectorGroups.split( /\s*,\s*/g );
	groups = groupsWorker.length > 1 ? [""] : groupsWorker;
	
	// validate groups
	for( var gwi = 0, tc = 0, gi = 0, g; groupsWorker.length > 1 && (g = groupsWorker[ gwi++ ]) !== undefined;) {
	    tc += (((l = g.match( /\(/g )) ? l.length : 0) - ((r = g.match( /\)/g )) ? r.length : 0));
	    groups[gi] = groups[gi] || "";
	    groups[gi] += (groups[gi] === "" ? g : "," + g);
	    if( tc === 0 ) 
		gi++;
	}
	
	var gCount = 0;				
	while( (selector = groups[gCount++]) !== undefined ) {
	    reg.quickTest.lastIndex = 0;
	    if( reg.quickTest.test( selector ) ) {
		result = get_context_from_sequence_selector( selector, root, includeRoot, flat )
		elements = groups.length > 1 ? elements.concat( result ) : result;
		continue;
	    }
	    reg.combinatorTest.lastIndex = 0;
	    if( reg.combinatorTest.test( selector ) ) {
		var parts, 
		    pLength, 
		    pCount = 0, 
		    combinators, 
		    cLength, 
		    cCount = 0, 
		    result;
			
		parts = selector.split( reg.combinator );
		pLength = parts.length;
		
		combinators = selector.match( reg.combinator ) || [""];					
		cLength = combinators.length;
		
		while( pCount < pLength ) {
		    var c, 
			part1, 
			part2;
			    
		    c = combinators[ cCount++ ].replace( reg.trim, "");
		    part1 = result || query( parts[pCount++], root, includeRoot, true, flat );
		    part2 = query( parts[ pCount++ ], 
							    c == "" || c == ">" ? part1 : root, 
							    c == "" || c == ">", 
							    true,
							    flat );
							    
		    result = query_combinator( part1, part2, c );
		}
		
		elements = groups.length > 1 ? elements.concat( result ) : result;							   
		result = undefined;
	    } else {
		result = query_selector( selector, root, includeRoot, flat );
		elements = groups.length > 1 ? elements.concat( result ) : result;
	    }
	}	
	    
	if( groups.length > 1 ) 
	    elements = filter(elements);

	return ( cache[ cacheKey ] = elements.slice(0));
    }

    function query_combinator( l, r, c ) {
	var result = [], 
	    uids = {}, 
	    proc = {}, 
	    succ = {}, 
	    fail = {}, 
	    combinatorCheck = Selector.combinator[c];
		
	for( var li = 0, le; le = l[ li++ ]; ) {
	    le.uid = le.uid || _uid++;
	    uids[ le.uid ] = le;
	}	
			
	for( var ri = 0, re; re = r[ ri++ ]; ) {
	    re.uid = re.uid || _uid++; 
	    if( !proc[ re.uid ] && combinatorCheck( re, uids, fail, succ ) ) {
		result[ result.length ] = re;
	    }
	    proc[ re.uid ] = re;
	}
	return result;
    }

    function query_selector( selector, root, includeRoot, flat ) {
	var context, 
	    passed = [],
	    count, 
	    totalCount, 
	    e, 
	    first = true, 
	    localCache = {};

	context = get_context_from_sequence_selector( selector, root, includeRoot, flat );
	count = context.length;
	totalCount = count - 1;

	var tests, recursive;
	if( /:(not|has)/i.test( selector ) ) {
	    recursive = selector.match( reg.recursive );
	    selector = selector.replace( reg.recursive, "" );
	}
	    
	// Get the tests (if there aren't any just set tests to an empty array).
	if( !(tests = selector.match( /:(\w|-)+(\([^\(]+\))*|\[[^\[]+\]/g )) )
	    tests = [];

	// If there were any recursive tests put them in the tests array (they were removed above).
	if( recursive ) 
	    tests = tests.concat( recursive );

	// Process each tests for all elements.
	var aTest;
	while( (aTest = tests.pop()) !== undefined ) {
	    var pc = persistCache[ aTest ], 
		testFuncScope,
		testFunc, 
		testFuncKey,
		testFuncArgs = [],
		isTypeTest = false, 
		isCountTest = false;
	
	    passed = [];
		
	    if( pc ) {
		testFuncKey = pc[ 0 ];
		testFuncScope = pc[ 1 ];
		testFuncArgs = pc.slice( 2 );
		testFunc = testFuncScope[ testFuncKey ];
	    } else if( !/^:/.test( aTest ) ) { // attribute
		var n = aTest.match( reg.attributeName );
		var v = aTest.match( reg.attributeValue );
		testFuncArgs[ 1 ] = n[ 1 ] || n[ 0 ];
		testFuncArgs[ 2 ] = v ? v[ 1 ] : "";
		testFuncKey = "" + aTest.match( /[~!+*\^$|=]/ );
		testFuncScope = Selector.attribute;	
		testFunc = testFuncScope[ testFuncKey ];
		persistCache[ aTest ] = [ testFuncKey, testFuncScope ].concat( testFuncArgs );
	    } else { // pseudo
		var pa = aTest.match( reg.pseudoArgs );
		testFuncArgs[ 1 ] = pa ? pa[ 1 ] : "";
		testFuncKey = aTest.match( reg.pseudoName )[ 1 ];
		testFuncScope = Selector.pseudos;
		
		if( /nth-(?!.+only)/i.test( aTest ) ) {
		    var a, 
			b, 
			nArg = testFuncArgs[ 1 ],
			nArgPC = persistCache[ nArg ];
			
		    if( nArgPC ) {
			a = nArgPC[ 0 ];
			b = nArgPC[ 1 ];
		    } else {
			var nParts = nArg.match( reg.nthParts );
			if( nParts ) {
			    a = parseInt( nParts[1],10 ) || 0;
			    b = parseInt( nParts[3],10 ) || 0;
			    
			    if( /^\+n|^n/i.test( nArg ) ) {
				a = 1;
			    } else if( /^-n/i.test( nArg ) ) {
				a = -1;
			    }
			    
			    testFuncArgs[ 2 ] = a;
			    testFuncArgs[ 3 ] = b;
			    persistCache[ nArg ] = [a, b];
			}
		    }
		} else if( /^:contains/.test( aTest ) ) {
		    var cArg = testFuncArgs[1];
		    var cArgPC = persistCache[ cArg ];
		    
		    if( cArgPC ) {
			testFuncArgs[1] = cArgPC;
		    } else {
			testFuncArgs[1] = persistCache[ cArg ] = new RegExp( cArg );	
		    }
		}
		testFunc = testFuncScope[ testFuncKey ];
		persistCache[ aTest ] = [ testFuncKey, testFuncScope ].concat( testFuncArgs );	
	    }				
	    
	    isTypeTest = /:(\w|-)+type/i.test( aTest);
	    isCountTest = /^:(nth[^-]|eq|gt|lt|first|last)/i.test( aTest );
	    if( isCountTest ) 
		testFuncArgs[ 3 ] = totalCount;	
	    
	    // Now run the test on each element (keep only those that pass)
	    var cLength = context.length, cCount = cLength -1 ;
	    while( cCount > -1 ) {
		e = context[ cCount-- ];
		if( first ) {
		    e.peppyCount = cCount + 1;
		}
		var pass = true;
		testFuncArgs[ 0 ] = e;
		if( isCountTest ) 
		    testFuncArgs[2] = e.peppyCount;

		if( !testFunc.apply( testFuncScope, testFuncArgs ) ) {
		    pass = false;
		}
		if( pass ) {
		    passed.push(e);
		}
	    }
	    context = passed;
	    first = false;
	}
	return passed;
    }
    var Selector = {
	attribute: {
	    "null": function( e, a, v ) { return !!get_attribute(e,a); },
	    "=" : function( e, a, v ) { return get_attribute(e,a) == v; },
	    "~" : function( e, a, v ) { return get_attribute(e,a).match(new RegExp('\\b'+v+'\\b')) },
	    "^" : function( e, a, v ) { return get_attribute(e,a).indexOf( v ) === 0; },
	    "$" : function( e, a, v ) { var attr = get_attribute(e,a); return attr.lastIndexOf( v ) === attr.length - v.length; },
	    "*" : function( e, a, v ) { return get_attribute(e,a).indexOf( v ) != -1; },
	    "|" : function( e, a, v ) { return get_attribute(e,a).match( '^'+v+'-?(('+v+'-)*('+v+'$))*' ); },
	    "!" : function( e, a, v ) { return get_attribute(e,a) !== v; }
	},
	pseudos: {
	    ":root" : function( e ) { return e === doc.getElementsByTagName( "html" )[0] ? true : false; },
	    ":nth-child" : function( e, n, a, b, t ) {	
		if( !e.nodeIndex ) {
		    var node = e.parentNode.firstChild, count = 0, last;
		    for( ; node; node = node.nextSibling ) {
			if( node.nodeType == 1 ) {
			    last = node;
			    node.nodeIndex = ++count;
			} //bruno, pablo, 15683426
		    }
		    last.IsLastNode = true;
		    if( count == 1 ) 
			last.IsOnlyChild = true;
		}
		var position = e.nodeIndex;
		if( n == "first" ) 
		    return position == 1;
		if( n == "last" )
		    return !!e.IsLastNode;
		if( n == "only" )
		    return !!e.IsOnlyChild;
		return (!a && !b && position == n) || 
			    ((a == 0 ? position == b : 
						    a > 0 ? position >= b && (position - b) % a == 0 :
							    position <= b && (position + b) % a == 0));
	    },				
	    ":nth-last-child" : function( e, n ) { return this[ ":nth-child" ]( e, n, a, b ); },  // TODO: n is not right.
	    ":nth-of-type" : function( e, n, t ) { return this[ ":nth-child" ]( e, n, a, b, t); },
	    ":nth-last-of-type" : function( e, n, t ) { return this[ ":nth-child" ](e, n, a, b, t ); }, // TODO: n is not right.
	    ":first-child" : function( e ) { return this[ ":nth-child" ]( e, "first" ); },
	    ":last-child" : function( e ) { return this[ ":nth-child" ]( e, "last" ); },
	    ":first-of-type" : function( e, n, t ) { return this[ ":nth-child" ]( e, "first", null, null, t ); },
	    ":last-of-type" : function( e, n, t ) { return this[ ":nth-child" ]( e, "last", null, null, t ); },
	    ":only-child" : function( e ) { return this[ ":nth-child" ]( e, "only" ); },
	    ":only-of-type" : function( e, n, t ) { return this[ ":nth-child" ]( e, "only", null, null, t ); },
	    ":empty" : function( e ) { 
		for( var node = e.firstChild, count = 0; node !== null; node = node.nextSibling ) {
		    if( node.nodeType === 1 || node.nodeType === 3 ) return false;
		}
		return true;
	    },
	    ":not" : function( e, s ) { return query( s, e, true, true, true ).length === 0; },
	    ":has" : function( e, s ) { return query( s, e, true, true, true ).length > 0; },
	    ":selected" : function( e ) { return e.selected; },
	    ":hidden" : function( e ) { return e.type === "hidden" || e.style.display === "none"; },
	    ":visible" : function( e ) { return e.type !== "hidden" && e.style.display !== "none"; },
	    ":input" : function( e ) { return e.nodeName.search( /input|select|textarea|button/i ) !== -1; },
	    ":radio" : function( e ) { return e.type === "radio"; },
	    ":checkbox" : function( e ) { return e.type === "checkbox"; },
	    ":text" : function( e ) { return e.type === "text"; },
	    ":header" : function( e ) { return e.nodeName.search( /h\d/i ) !== -1; },
	    ":enabled" : function( e ) { return !e.disabled && e.type !== "hidden"; },
	    ":disabled" : function( e ) { return e.disabled; },
	    ":checked" : function( e ) { return e.checked; },
	    ":contains" : function( e, s ) { return s.test( (e.textContent || e.innerText || "") ); },
	    ":parent" : function( e ) { return !!e.firstChild; },
	    ":odd" : function( e ) { return this[ ":nth-child" ]( e, "2n+2", 2, 2 ); },
	    ":even" : function( e ) { return this[ ":nth-child" ]( e, "2n+1", 2, 1 ); },
	    ":nth" : function( e, s, i ) { return s == i; },
	    ":eq" : function( e, s, i ) { return s == i; },
	    ":gt" : function( e, s, i ) { return i > s; },
	    ":lt" : function( e, s, i ) { return i < s; },
	    ":first" : function( e, s, i ) { return i == 0 },
	    ":last" : function( e, s, i, end ) { return i == end; }
	},
	combinator : {
	    "" : function( r, u, f, s ) {
		var rUID = r.uid;
		while( (r = r.parentNode) !== null && !f[ r.uid ]) {
		    if( !!u[ r.uid ] || !!s[ r.uid ] ) {
			return (s[ rUID ] = true);
		    }
		}
		return (f[ rUID ] = false);
	    },
	    ">" : function( r, u, f, s ) {
		return r.parentNode && u[ r.parentNode.uid ] ;
	    },
	    "+" : function( r, u, f, s ) {
		while( (r = r.previousSibling) !== null && !f[ r.uid ] ) {
		    if( r.nodeType === 1 )
			return r.uid in u;
		}
		return false;
	    },
	    "~" : function( r, u, f, s ) {
		var rUID = r.uid;
		while( (r = r.previousSibling) !== null && !f[ r.uid ] ) {
		    if( !!u[ r.uid ] || !!s[ r.uid ] ) {
			return (s[ rUID ] = true);
		    }
		}
		return (f[ rUID ] = false);
	    }
	}
    }
    
    var dom = ModuleManager.create('dom', 'built-in', {
	query: query,
    });

    /******************** builtin **************************/
    var builtin = ModuleManager.create('builtin','built-in', {
        publish: publish,
        require: require,
	$: function () { 
	    var result = array(arguments).map(function (element) { return query(isinstance(element, String)? '#' + element : element)[0]; });
	    return (len(result) == 1)? result[0] : result; 
	},
	$$: query,
	object: object,
	type: type,
	extend: function extend() {return __extend__.apply(this, [false].concat(array(arguments)));}
    });

    // ******************************* MORE BUILTINS ************************************* //
    // For type constructor, super, isundefined, isinstance, issubclass
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
    
    function isundefined(value) {
	return typeof(value) === "undefined";
    }

    function isinstance(object, _type) {
	if (_type && type(_type) != Array) _type = [_type];
	if (!_type || (type(_type) == Array && _type[0] == undefined))
	    // end of recursion
	    return false;
	else {
	    var others = [];
	    for each (var t in _type) {
		if (object && type(object) == t) return true;
		others = others.concat(t.__subclasses__);
	    }
	    return isinstance(object, others);
	}
    }

    function issubclass(type2, _type) {
	if (_type && type(_type) != Array) 
	    _type = [_type];
	if (!_type || (type(_type) == Array && _type[0] == undefined))
	    // end of recursion
	    return false;
	else {
	    var others = [];
	    for each (var t in _type) {
		if (type2 == t) return true;
		others = others.concat(t.__subclasses__);
	    }
	    return issubclass(type2, others);
	}
    }

    //Arguments wraped, whit esteroids
    var Arguments = type('Arguments', object, {
        __init__: function(args, def) {
            this.func = args.callee;
            this.collect = Array.prototype.slice.call(args);
            var names = this.func.toString().match(/^[\s\(]*function[^(]*\(([^\)]*)\)/)[1].replace(/\s+/g, '').split(',');
            this.names = names.length == 1 && !names[0] ? [] : names;
            this._defaults = def;
            for (var i = 0, length = this.names.length; i < length; i++)
            this[this.names[i]] = this[i] = this.collect[i];
            this.populated = false;
        },
	
	__iter__ : function(){
            for each (var arg in this.collect)
                yield arg;
        },

	__len__ : function(){
            return len(this.collect);
        },

        _populate: function() {
            this._kwargs = {};
            var haskwargs = false;
            for (var p in this._defaults || {})
                this._kwargs[p] = this._defaults[p];
            var last = this.collect[this.collect.length - 1];
            if (last && type(last) == Object) {
                haskwargs = true;
                for (var p in last)
                    this._kwargs[p] = last[p];
            }
            if (this.names.length < this.collect.length)
                this._args = this.collect.slice(this.names.length, (haskwargs)? this.collect.length - 1 : this.collect.length);
            else
                this._args = [];
            this.populated = true;
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

    var Template = type('Template', object, {
        //Static
        pattern: /(^|.|\r|\n)(%\((.+?)\))s/,
    },{
	//Prototype
	__init__: function(template, pattern) {
	    this.template = str(template);
	    this.pattern = pattern || Template.pattern;
	},

	evaluate: function(object) {
	    if (callable(object.toTemplateReplacements))
		object = object.toTemplateReplacements();

	    return this.template.gsub(this.pattern, function(match) {
		if (object == null) 
		    return '';

		var before = match[1] || '';
		if (before == '\\') 
		    return match[2];

		var ctx = object, expr = match[3];
		var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
		match = pattern.exec(expr);
		if (match == null) 
		    return before;

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
        if (isinstance(value, Number) || isinstance(value, String))
            return value;
        else if (isinstance(value, Array))
            return value.reduce(function(x, y) {return "" + id(x) + id(y)});
        else if (!value['__hash__']) {
            value['__hash__'] = id.next();
        }
        return value['__hash__'];
    };

    id.current = 0;
    id.next = function () { return id.current += 1; };

    function getattr(object, name, def) {
	//TODO: validar argumentos
        var attr = null;
        if (!isundefined(object)) {
            attr = object[name];
            if (!isundefined(attr)) {
                if (type(attr) == Function && isundefined(attr['__new__'])) {
                    var method = attr, obj = object;
                    return function() { return method.apply(obj, array(arguments)); }
                } else {
                    return attr;
                }
            }
        }
        if (isundefined(def))
	   throw new AttributeError(object + ' has no attribute ' + name);
	else
	   return def;
    }
    
    function setattr(object, name, value) {
	object[name] = value;
    }

    function hasattr(object, name) {
	try {
	    getattr(object, name);
	    return true;
	} catch (e if isinstance(e, AttributeError)) {
	    return false;
	}
    }

    var Dict = type('Dict', object, {
        __init__: function(object) {
            this._value = {};
            this._key = {};
            if (!object || (type(object) == Array && !bool(object))) return;
            if (object && isinstance(object, Dict)) {
                this._value = extend({}, object._value);
                this._key = extend({}, object._key);
            } else if (callable(object['next'])) {
                for each (var [key, value] in object)
                    this.set(key, value);
            } else if (type(object) == Array && type(object[0]) == Array) {
                for each (var [key, value] in object)
                    this.set(key, value);
            } else if (type(object) == Object){
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
        __nonzero__: function(){
            return bool(this._key);
        },
        __len__: function() {
            return len(this._key);
        },
        set: function(key, value) {
            var hash = id(key);
            this._key[hash] = key;
            return this._value[hash] = value;
        },
        setdefault: function(key, value){
            var ret = this.get(key);
            if (ret) 
		return ret;
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
        values: function() {
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

    var Set = type('Set', object, {
        __init__: function(elements){
            var elements = elements || [];
            if (type(elements) != Array)
                throw new TypeError(elements + ' object is not array');
            this.elements = unique(elements);
        },
        __contains__: function(element){
            return include(this.elements, element);
        },
        __nonzero__: function(){
            return bool(this.elements);
        },
        __len__: function() {
            return len(this.elements);
        },
        __eq__: function(set) {
            return true;
        },
        __ne__: function(set) {
            return true;
        },
        __copy__: function(){
            return this.copy();
        },
        __deepcopy__: function(){
            return new Set(this.elements.__deepcopy__());
        },
        __iter__: function() {
            for each (var element in this.elements)
                yield element;
        },
        add: function(element) {
          if (!include(this.elements, element))
              this.elements.push(element);
        },
        remove: function(element){
          var index = this.elements.indexOf(element);
          if (index == -1)
              throw new KeyError(element);
          return this.elements.splice(index, 1)[0];
        },
        discard: function(element){
          try {
              return this.remove(element);
          } catch (e if e instanceof KeyError) {
              return null;
          }
        },
        pop: function(){
            return this.elements.pop();
        },
        update: function(set){
            var elements = (type(set) == Array)? set : set.elements;
            this.elements = unique(this.elements.concat(elements));
        },
        union: function(set){
            var elements = (type(set) == Array)? set : set.elements;
            return new Set(this.elements.concat(elements));
        },
        intersection: function(set){
            return new Set(this.elements.filter(function(e) { return include(set, e); }));
        },
        intersection_update: function(set){
            this.elements = this.elements.filter(function(e) { return include(set, e); });
        },
        issubset: function(set){
            if (this.length > set.length) return false;
            return this.elements.map(function(e){ return include(set, e) }).every(function(x){ return x });
        },
        issuperset: function(set){
            if (this.length < set.length) return false;
            return set.elements.map(function(e){ return include(this, e) }, this).every(function(x){ return x });
        },
        clear: function(){
            return this.elements.clear();
        },
        copy: function(){
            return new Set(this.elements);
        },
        difference: function(set){
            return new Set(this.elements.filter(function(e) { return !include(set, e); }));
        },
        difference_update: function(set){
            this.elements = this.elements.filter(function(e) { return !include(set, e); });
        },
        symmetric_difference: function(set){
            var set = this.difference(set);
            return set.difference(this);
        },
        symmetric_difference_update: function(set){
            var set = this.difference(set);
            this.elements = set.difference(this).elements;
        }
    });

    //Populate builtins
    __extend__(false, builtin, {
        super: super,
	isundefined: isundefined,
        isinstance: isinstance,
        issubclass: issubclass,
        Arguments: Arguments,
        Template: Template,
        Dict: Dict,
        Set: Set,
	hash: hash,
        id: id,
	getattr: getattr,
	setattr: setattr,
	hasattr: hasattr,
        assert: function(test, text) {
            if ( test === false )
                throw new AssertionError( text || 'An assertion failed!');
            return test;
        },
        bool: function(object) {
            if (object && callable(object['__nonzero__']))
                return object.__nonzero__();
            if (object && type(object) == Array)
                return object.length != 0;
            if (object && type(object) == Object)
                return keys(object).length != 0;
            return Boolean(object);
        },
        callable: function(object) {
            return object && type(object) == Function;
        },
        chr: function(number){ 
	    if (type(number) != Number) throw new TypeError('An integer is required');
	    return String.fromCharCode(number);
        },
        ord: function(ascii) {
            if (type(number) != String) throw new TypeError('An string is required');
            return ascii.charCodeAt(0);
        },
        bisect: function(array, element) {
            var i = 0;
            for (var length = array.length; i < length; i++)
                if (array[i].__cmp__(element) > 0) return i;
            return i;
        },
        //no se porque no anda el dir
        equal: function(object1, object2) {
            if (callable(object1['__eq__'])) return object1.__eq__(object2);
            return object1 == object2;
        },
        nequal: function(object1, object2) {
            if (callable(object1['__ne__'])) return object1.__ne__(object2);
            return object1 != object2;
        },
	//TODO: creo que va a ser mejor un number en lugar de float o int
        number: function(value) {
            if (isinstance(value, String) || isinstance(value, Number)) {
		var number = Number(value);
		if (isNaN(number))
		    throw new ValueError('Invalid literal');
		return number;
	    }
	    throw new TypeError('Argument must be a string or number');
        },
	float: function(value) {
            if (isinstance(value, String) || isinstance(value, Number)) {
		var number = Number(value);
		if (isNaN(number))
		    throw new ValueError('Invalid literal');
		return number;
	    }
	    throw new TypeError('Argument must be a string or number');
        },
        flatten: function(array) { 
            return array.reduce(function(a,b) { return a.concat(b); }, []); 
        },
        include: function(object, element){
            if (object == undefined) return false;
            if (callable(object['__contains__'])) return object.__contains__(element);
            return object.indexOf(element) > -1;
        },
        int: function(value) {
            if (isinstance(value, String) || isinstance(value, Number)) {
		var number = Math.floor(value);
		if (isNaN(number))
		    throw new ValueError('Invalid literal');
		return number;
	    }
	    throw new TypeError('Argument must be a string or number');
        },
        len: function(object) {
            if (object && callable(object['__len__']))
                return object.__len__();
            if (object['length'] != undefined) 
                return object.length;
            if (object && type(object) == Object) 
                return keys(object).length;
            throw new TypeError("object of type '" + type(object) + "' has no len()");
        },
        array: function(iterable) {
            if (!iterable) 
                return [];
            if (callable(iterable['__iterator__'])) 
                return [e for each (e in iterable)];
            if (iterable.length != undefined)
                return Array.prototype.slice.call(iterable);
        },
        mult: function(array, value) {
            var result = [];
            for (var i = 0; i < value; i++)
                result = result.concat(array);
            return result;
        },
        print: window.console && window.console.log || function(){},
        range: function(start, stop, step){
            var rstep = step || 1;
            var rstop = (stop == undefined)? start : stop;
            var rstart = (stop == undefined)? 0 : start;
            var ret = [];
            for (var i = rstart; i < rstop; i += rstep)
                ret.push(i);
            return ret;
        },
        str: function(object) {
            if (object && callable(object['__str__'])) 
                return object.__str__();
            return String(object);
        },
        values: function(obj){ 
            return [e for each (e in obj)]
        },
        keys: function(object){
            return [e for (e in object)];
        },
	items: function(object){
            return zip(keys(object), values(object));
        },
        unique: function(sorted) {
            return sorted.reduce(function(array, value) {
                if (!include(array, value))
                    array.push(value);
                return array;
                }, []);
        },
        xrange: function(start, stop, step){
            var xstep = step || 1;
            var xstop = (!stop)? start : stop;
            var xstart = (!stop)? 0 : start;
            for (var i = xstart; i < xstop; i += xstep)
                yield i;
        },
        zip: function(){
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

    /******************** POPULATE **************************/
    ModuleManager.add(sys);
    ModuleManager.add(exception);
    ModuleManager.add(event);
    ModuleManager.add(timer);
    ModuleManager.add(ajax);
    ModuleManager.add(dom);
    ModuleManager.add(builtin);
    publish(builtin);
    publish(exception);

    // WHERE
    var script = dom.query('script[src*"protopy.js"]');
    if (script.length != 1)
	throw new Exception('Error fatal');
    var m = script[0].src.match(new RegExp('^.*' + location.host + '(/?.*/?)protopy.js$', 'i'));
    ModuleManager.base = m[1];
    var config = script[0].getAttribute('pyconfig');
    if (config) //TODO: validate config
	__extend__(false, ModuleManager, eval('({' + config + '})'));
})();

// ******************************* EXTENDING JAVASCRIPT ************************************* //
(function(){
    //--------------------------------------- String -------------------------------------//
    extend(String, {
	scriptfragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
	interpret: function(value) {
	    return value == null ? '' : String(value);
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

	//% operator like python
	subs: function() {
	    var args = flatten(array(arguments));
	    //%% escaped
	    var string = this.gsub(/%%/, function(match){ return '<ESC%%>'; });
	    if (args[0] && (type(args[0]) == Object || isinstance(args[0], object)))
                string = new Template(string, args[1]).evaluate(args[0]);
	    else
                string = string.gsub(/%(-?\d*|\d*\.\d*)([s,n])/, function(match) {
		    if (args.length == 0) return match[0];
		    var value = (match[2] === 's')? str(args.shift()) : number(args.shift());
		    return  value.format(match[1]); 
                });
	    return string.gsub(/<ESC%%>/, function(match){ return '%'; });
	},

	format: function(f) { 
	    var pad = (f[0] == '0')? '0' : ' ';
	    var left = false;
	    if (f[0] == '-') {
		left = true;
		f = f.substr(1);
	    };
	    f = Number(f);
	    var result = this;
	    while(result.length < f)
		result = (left)? result + pad: pad + result;
	    return result;
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

	striptags: function() {
	    return this.replace(/<\/?[^>]+>/gi, '');
	},

	stripscripts: function() {
	    return this.replace(new RegExp(String.scriptfragment, 'img'), '');
	},

	extractscripts: function() {
	    var match_all = new RegExp(String.scriptfragment, 'img');
	    var match_one = new RegExp(String.scriptfragment, 'im');
	    return (this.match(match_all) || []).map(function(script_tag) {
		return (script_tag.match(match_one) || ['', ''])[1];
	    });
	},

	evalscripts: function() {
	    return this.extractscripts().map(function(script) { return eval(script) });
	},

	escapeHTML: function() {
	    var self = arguments.callee;
	    self.text.data = this;
	    return self.div.innerHTML;
	},

	unescapeHTML: function() {
	    var div = document.createElement('div');
	    div.innerHTML = this.striptags();
	    return div.childNodes[0] ? (div.childNodes.length > 1 ?
	    array(div.childNodes).reduce(function(memo, node) { return memo + node.nodeValue }, '') :
	    div.childNodes[0].nodeValue) : '';
	},
    
	isJSON: function(){
	    var testStr = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
	    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(testStr);
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

	startswith: function(pattern) {
	    return this.indexOf(pattern) === 0;
	},

	endswith: function(pattern) {
	    var d = this.length - pattern.length;
	    return d >= 0 && this.lastIndexOf(pattern) === d;
	},

	blank: function() {
	    return /^\s*$/.test(this);
	}
    });

    String.prototype.gsub.prepare_replacement = function(replacement) {
	if (callable(replacement)) 
	    return replacement;
	var template = new Template(replacement);
	return function(match) { return template.evaluate(match) };
    };

    extend(String.prototype.escapeHTML, {
	div:  document.createElement('div'),
	text: document.createTextNode('')
    });

    String.prototype.escapeHTML.div.appendChild(String.prototype.escapeHTML.text);

    //--------------------------------------- Number -------------------------------------//
    extend(Number.prototype, {
	format: function(f) {
	    var pad = (f[0] == '0')? '0' : ' ';
	    var left = false;
	    if (f[0] == '-') {
		left = true;
		f = f.substr(1);
	    };
	    var [fe, fd] = f.split('.').map(function (n) {return Number(n);});
	    if (!isundefined(fd))
		var result = this.toFixed(fd);
	    else 
		var result = str(this);
	    [e, d] = result.split('.');
	    while(e.length < fe)
		e = (left)? e + pad : pad + e;
	    return e + (!isundefined(d)? '.' + d : '');
	}
    });

    //--------------------------------------- Number -------------------------------------//
    extend(Date.prototype, {
	//Returns an ISO8601 string *in UTC* for the provided date (Prototype's Date.toJSON() returns localtime)
	toISO8601: function() {
	    return this.getUTCFullYear() + '-' +
	       (this.getUTCMonth() + 1).format('02') + '-' +
	       this.getUTCDate().format('02') + 'T' +
	       this.getUTCHours().format('02')   + ':' +
	       this.getUTCMinutes().format('02') + ':' +
	       this.getUTCSeconds().format('02') + '.' +
	       this.getUTCMilliseconds().format('03');
	}
    });

    //--------------------------------------- Element -------------------------------------//
    extend(Element, {
	iselement: function(object) {
	    return !!(object && object.nodeType == 1);
	},
	_insertion_translations: {
	    before: function(element, node) {
		element.parentNode.insertBefore(node, element);
	    },
	    top: function(element, node) {
		element.insertBefore(node, element.firstChild);
	    },
	    bottom: function(element, node) {
		element.appendChild(node);
	    },
	    after: function(element, node) {
		element.parentNode.insertBefore(node, element.nextSibling);
	    },
	    tags: {
		TABLE:  ['<table>',                '</table>',                   1],
		TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
		TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
		TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
		SELECT: ['<select>',               '</select>',                  1]
	    }
	},
	_get_content_from_anonymous_element: function(tagName, html) {
	    var div = document.createElement('div'), t = Element._insertion_translations.tags[tagName];
	    if (t) {
		div.innerHTML = t[0] + html + t[1];
		t[2].times(function() { div = div.firstChild });
	    } else div.innerHTML = html;
	    return array(div.childNodes);
	}
    });
    extend(Element.prototype, {
	visible: function() {
	    return this.style.display != 'none';
	},
	toggle: function() {
	    this[this.visible() ? 'hide' : 'show']();
	    return this;
	},
	hide: function() {
	    this.style.display = 'none';
	    return this;
	},
	show: function() {
	    this.style.display = '';
	    return this;
	},
	remove: function() {
	    this.parentNode.removeChild(this);
	    return this;
	},
	update: function(content) {
	    if (Element.iselement(content)) return this.update().insert(content);
	    this.innerHTML = content.stripscripts();
	    getattr(content, 'evalscripts')();
	    return this;
	},
	insert: function(insertions) {
	    if (isinstance(insertions, String) || isinstance(insertions, Number) || Element.iselement(insertions))
		insertions = {bottom:insertions};
	    var content, insert, tagName, childNodes, self = this;
	    for (var position in insertions) {
		content  = insertions[position];
		position = position.toLowerCase();
		insert = Element._insertion_translations[position];

		if (Element.iselement(content)) {
		    insert(this, content);
		    continue;
		}

		tagName = ((position == 'before' || position == 'after') ? this.parentNode : this).tagName.toUpperCase();
		childNodes = Element._get_content_from_anonymous_element(tagName, content.stripscripts());

		if (position == 'top' || position == 'after') 
		    childNodes.reverse();
		childNodes.forEach(function (e) { insert(self, e); });
		getattr(content, 'evalscripts')();
	    }
	    return this;
	},
	select: function(selector) {
	    return query(selector, this);
	}
    });

    //--------------------------------------- Forms -------------------------------------//    
    var Form = {
	disable: function() {
	    array(this.elements).forEach(function(e) {e.disable();});
	},
	enable: function() {
	    array(this.elements).forEach(function(e) {e.enable();});
	},
	serialize: function() {
	    var elements = array(this.elements);
	    var data = elements.reduce(function(result, element) {
		if (!element.disabled && element.name) {
		    key = element.name; value = element.get_value();
		    if (value != null && element.type != 'file' && (element.type != 'submit')) {
			if (key in result) {
			    // a key is already present; construct an array of values
			    if (type(result[key]) != Array) 
				result[key] = [result[key]];
			    result[key].push(value);
			} else result[key] = value;
		    }
		}
		return result;
	    }, {});
	    return data;
	}
    }
    Form.Element = {
	serialize: function() {
	    if (!this.disabled && this.name) {
		var value = this.get_value();
		if (value != undefined) {
		    var pair = { };
		    pair[this.name] = value;
		    return pair;
		}
	    }
	    return '';
	},

	get_value: function() {
	    var method = this.tagName.toLowerCase();
	    return Form.Serializers[method](this);
	},

	set_value: function(value) {
	    var method = this.tagName.toLowerCase();
	    Form.Serializers[method](this, value);
	},

	clear: function() {
	    this.value = '';
	},

	present: function() {
	    return this.value != '';
	},

	activate: function() {
	    try {
		this.focus();
		if (this.select && (this.tagName.toLowerCase() != 'input' || !include(['button', 'reset', 'submit'], element.type)))
		    this.select();
	    } catch (e) { }
	},

	disable: function() {
	    this.disabled = true;
	},

	enable: function() {
	    this.disabled = false;
	}
    }
    
    Form.Serializers = {
	input: function(element, value) {
	    switch (element.type.toLowerCase()) {
	    case 'checkbox':
	    case 'radio':
		return this.input_selector(element, value);
	    default:
		return this.textarea(element, value);
	    }
	},

	input_selector: function(element, value) {
	    if (typeof(value) === 'undefined') return element.checked ? element.value : null;
	    else element.checked = !!value;
	},

	textarea: function(element, value) {
	    if (typeof(value) === 'undefined') return element.value;
	    else element.value = value;
	},

	select: function(element, value) {
	    if (typeof(value) === 'undefined')
	    return this[element.type == 'select-one' ?
		'select_one' : 'select_many'](element);
	    else {
	    var opt, currentValue, single = type(value) != Array;
	    for (var i = 0, length = element.length; i < length; i++) {
		opt = element.options[i];
		currentValue = this.option_value(opt);
		if (single) {
		    if (currentValue == value) {
			opt.selected = true;
			return;
		    }
		} else 
		    opt.selected = include(value, currentValue);
	    }
	    }
	},

	select_one: function(element) {
	    var index = element.selectedIndex;
	    return index >= 0 ? this.option_value(element.options[index]) : null;
	},

	select_many: function(element) {
	    var values, length = element.length;
	    if (!length) return null;

	    for (var i = 0, values = []; i < length; i++) {
	    var opt = element.options[i];
	    if (opt.selected) values.push(this.option_value(opt));
	    }
	    return values;
	},

	option_value: function(opt) {
	    return opt.hasAttribute('value') ? opt.value : opt.text;
	}
    }
    
    //For firefox
    extend(HTMLFormElement.prototype, Form );
    extend(HTMLInputElement.prototype, Form.Element );
    extend(HTMLSelectElement.prototype, Form.Element );
    extend(HTMLTextAreaElement.prototype, Form.Element );
})();