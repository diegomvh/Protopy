//******************************* PROTOPY CORE *************************************//
(function() {
    var __modules__ = {};
    var __paths__ = {};
    
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

    //Publish simbols in modules
    function __publish__(object) {
        for (var k in object) {
	    this[k] = object[k];
        }
    }

    //Add simbols to builtins
    function __builtins__(object) {
        __extend__(false, __modules__['__builtin__'], object);
        __extend__(false, __modules__['__main__']['__builtins__'], object);
        __extend__(false, window, object);
    }
    
    function __doc__(obj, doc) {
        if ( doc === undefined && type(obj) === String)
	    this.__doc__ = obj;
	else if (type(doc) === String)
	    obj.__doc__ = doc;
    }
//memoria ps2 16, cable usb del mp3, auriculares, un cargador y baterias, un pack de dvd
    //The module concept
    function Module(name, file, source) {
        this['__file__'] = file;
        this['__name__'] = name;
        if (file == 'built-in') {
            if (source && source instanceof Object)
                __extend__(true, this, source);
        }
    }
    
    //Load Modules
    function __load__(module_name) {
    	
        var package = module_name.endswith('.*'),
        	name = package ? module_name.slice(0, module_name.length - 2) : module_name,
	    	names = name.split('.'),
                mod = __modules__[name];
    
        if (!mod) {
            //Only firefox and synchronous, sorry
	    if (package){
		var file = sys.module_url(name, '__init__.js');
	    } else {
		var index = name.lastIndexOf('.');
		var [ pkg, filename ] = index != -1? [ name.slice(0, index), name.slice(index + 1)] : [ '', name];
		var file = sys.module_url(pkg, filename + '.js');
	    }
            var code = null,
		request = new XMLHttpRequest();
            request.open('GET', file, false); 
            request.send(null);
            if(request.status != 200)
		throw new LoadError(file);
            //Tego el codigo, creo el modulo
	    var code = '(function(){ ' + request.responseText + '});';
            mod = new Module(name, file);
            __modules__[name] = mod;
            //Decoro el modulo con lo que reuiere para funcionar
	    mod.$P = __publish__;
	    mod.$L = __load__;
	    mod.$B = __builtins__;
	    mod.$D = __doc__;
	    mod.type = type;
	    //Listo el modululo base largo el evento
	    event.publish('onModuleCreated', [this, mod]);
            try {
                with (mod) {
		    eval(code).call(mod);
                }
            } catch (exception) {
                delete __modules__[name];
                throw exception;
            }
	    //EL modulo esta cargado, quito la decoracion
	    delete mod.$P;
	    delete mod.$L;
	    delete mod.$B;
	    delete mod.$D;
	    delete mod.type;
        }
        event.publish('onModuleLoaded', [this, mod]);
        switch (arguments.length) {
            case 1:
                    // Returns module
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
    function object() { 
	throw 'The wormhole stop here. Please, is just javascript not python :)'; 
    };

    //For the static
    object.__class__ = type;
    object.__new__ = function __new__(name, bases, attrs) {
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
    object.__doc__ = "";

    //For de prototype
    object.prototype.__init__ = function __init__(){};
    object.prototype.__doc__ = "";
    object.prototype.__str__ = function __str__(){ return this.__module__ + '.' + this.__name__ };

    // Type constructor
    function type(name) {
	if (name == undefined || name == null)
	    throw new TypeError('Invalid arguments');
	var args = Array.prototype.slice.call(arguments).slice(1);
	if (args.length == 0)
	    return name.constructor;
	if (args[0] instanceof Array && args[0][0] != undefined)
	    var bases = args.shift();
	else if (!(args[0] instanceof Array) && args[0] instanceof Function)
	    var bases = [args.shift()];
	else 
	    var bases = [object];
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
	new_type.__static__ = {};
	for each (var base in bases.reverse()) {
	    base.__subclasses__.push(new_type);
	    __extend__(true, new_type.__static__, base.__static__);
	    new_type.__new__ = base.__new__;
	}

	//Decorando los atributos
	classAttrs['__name__'] = instanceAttrs['__name__'] = name;
	classAttrs['__module__'] = instanceAttrs['__module__'] = this['__name__'];

	//Construyendo el tipo
        __extend__(true, new_type.__static__, classAttrs);
	__extend__(true, new_type, new_type.__static__);

	//Constructor de instancia
	new_type = new_type.__new__(new_type.__name__, new_type.__bases__, instanceAttrs);
	return new_type;
    }
    
    // ******************************* MODULES ************************************* //
    /******************** sys ***********************/
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
    
    var sys = __modules__['sys'] = new Module('sys', 'built-in', { 
	'version': '0.05',
	'browser': {
	    'IE':     !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
	    'Opera':  navigator.userAgent.indexOf('Opera') > -1,
	    'WebKit': navigator.userAgent.indexOf('AppleWebKit/') > -1,
	    'Gecko':  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1,
	    'MobileSafari': !!navigator.userAgent.match(/Apple.*Mobile.*Safari/),
	    'features': {
		'XPath': !!document.evaluate,
		'SelectorsAPI': !!document.querySelector,
		'ElementExtensions': !!window.HTMLElement,
		'SpecificElementExtensions': document.createElement('div')['__proto__'] &&
						document.createElement('div')['__proto__'] !==
						document.createElement('form')['__proto__']
	    }
	},
	'get_transport': function get_transport() {
	    if (this.browser.Gecko || this.browser.WebKit)
		return new XMLHttpRequest();
	    return false;
	},
	'get_gears': get_gears,
	'register_module_path': function register_module_path(module, path) { 
	    __paths__[module] = this.base_url + path; 
	},
	'module_url': function module_url(module, postfix) {
	    var url = null;
	    for (var s in __paths__)
		if (s && module.indexOf(s) == 0) {
		    url = __paths__[s].split('/');
		    url = url.concat(module.slice(len(s)).split('.'));
		    break;
		}
	    if (!url) {
		url = __paths__[''].split('/');
		url = url.concat(module.split('.'));
	    }
	    if (postfix) 
		url = url.concat(postfix.split('/'));
	    //Si termina con / se la agrego al final, puese ser un camino y no un archivo
	    //FIXME: Se puede hacer mejor
	    var length = len(url) - 1;
	    url = url.filter( function (element, index) { return len(element) > 0 || (element == '' && index == length) });
	    return url.join('/');
	},
	'modules': __modules__,
	'paths': __paths__
    });

    sys.browser.features.Gears = !!get_gears() || false;
    /******************** exception ***********************/
    var Exception = type('Exception', {
        '__init__': function(message) {
            //TODO: Ver como tomar mas informacion de quien larga la exception
            //this.caller = arguments.callee.caller;
            this.args = arguments;
            this.message = (message && type(message) == String)? message : '';
        },
        '__str__': function() { return this.__name__ + ': ' + this.message; }
    });
    
    var exception = __modules__['exceptions'] = new Module('exceptions', 'built-in', {
        'Exception': Exception,
        'AssertionError': type('AssertionError', Exception),
        'AttributeError': type('AttributeError', Exception),
        'LoadError':  type('LoadError', Exception),
        'KeyError':  type('KeyError', Exception),
        'NotImplementedError':  type('NotImplementedError', Exception),
        'TypeError':  type('TypeError', Exception),
        'ValueError':  type('ValueError', Exception),
    });

    /********************** event **************************/
    // From dojo
    var __listener__ = {
	// create a dispatcher function
 	'get_dispatcher': function get_dispatcher() {
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
	'add': function add(source, method, listener) {
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
	'remove': function(source, method, handle) {
	    var func = ( source || window )[method];
	    // remember that handle is the index+1 (0 is not a valid handle)
	    if(func && func._listeners && handle--) {
		delete func._listeners[handle]; 
	    }
	}
    };

    var __eventlistener__ = {
	'add': function add(node, name, fp) {
	    if(!node)
		return; 
	    name = this._normalizeEventName(name);
	    fp = this._fixCallback(name, fp);
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
	'remove': function remove(node, event, handle) {
	    if (node)
		node.removeEventListener(this._normalizeEventName(event), handle, false);
	},
	'_normalizeEventName': function _normalizeEventName(name) {
	    // Generally, name should be lower case, unless it is special
	    // somehow (e.g. a Mozilla DOM event).
	    // Remove 'on'.
	    return name.slice(0,2) =="on" ? name.slice(2) : name;
	},
	'_fixCallback': function _fixCallback(name, fp) {
	    // By default, we only invoke _fixEvent for 'keypress'
	    // If code is added to _fixEvent for other events, we have
	    // to revisit this optimization.
	    // This also applies to _fixEvent overrides for Safari and Opera
	    // below.
	    return name != "keypress" ? fp : function(e) { return fp.call(this, this._fixEvent(e, this)); };
	},
	'_fixEvent': function _fixEvent(evt, sender){
	    // _fixCallback only attaches us to keypress.
	    // Switch on evt.type anyway because we might 
	    // be called directly from dojo.fixEvent.
	    switch(evt.type){
		    case "keypress":
			    this._setKeyChar(evt);
			    break;
	    }
	    return evt;
	},
	'_setKeyChar': function _setKeyChar(evt){
	    evt.keyChar = evt.charCode ? String.fromCharCode(evt.charCode) : '';
	}
    };

    var __topics__ = {};

    function __connect__ (obj, event, context, method) {
	// FIXME: need a more strict test
	var isNode = obj && (obj.nodeType || obj.attachEvent || obj.addEventListener);
	// choose one of three listener options: raw (connect.js), DOM event on a Node, custom event on a Node
	// we need the third option to provide leak prevention on broken browsers (IE)
	var lid = !isNode ? 0 : 1, l = [__listener__, __eventlistener__][lid];
	// create a listener
	var h = l.add(obj, event, isinstance(method, String)? getattr(context, method) : method);
	// formerly, the disconnect package contained "l" directly, but if client code
	// leaks the disconnect package (by connecting it to a node), referencing "l" 
	// compounds the problem.
	// instead we return a listener id, which requires custom _disconnect below.
	// return disconnect package
	return [ obj, event, h, lid ];
    }
    
    function __disconnect__ (obj, event, handle, listener) {
        ([__listener__, __eventlistener__][listener]).remove(obj, event, handle);
    }

    var event = __modules__['event'] = new Module('event', 'built-in', {
        'connect': function connect(obj, event, context, method) {
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
	    return __connect__.apply(this, args); /*Handle*/
	},
        'disconnect': function disconnect(handle) {
	    if(handle && typeof(handle[0]) !== 'undefined') {
		__disconnect__.apply(this, handle);
		// let's not keep this reference
		delete handle[0];
	    }
	},
        'subscribe': function subscribe(topic, context, method) {
	    return [topic, __listener__.add(__topics__, topic, (method && isinstance(method, String))? getattr(context, method) : context)];
	},
        'unsubscribe': function unsubscrib(handle) {
	    if(handle)
		__listener__.remove(__topics__, handle[0], handle[1]);
	},
        'publish': function publish(topic, args) {
	    var func = __topics__[topic];
	    if(func)
		func.apply(this, args || []);
	},
        'connectpublisher': function connectpublisher(topic, obj, event) {
	    var pf = function() { 
		this.publish(topic, arguments); 
	    }
	    return (event) ? this.connect(obj, event, pf) : this.connect(obj, pf); //Handle
	},
        'fixevent': function(){},
        'stopevent': function(){},
	'keys': {   'BACKSPACE': 8, 'TAB': 9, 'CLEAR': 12, 'ENTER': 13, 'SHIFT': 16, 'CTRL': 17, 'ALT': 18, 'PAUSE': 19, 'CAPS_LOCK': 20, 
		    'ESCAPE': 27, 'SPACE': 32, 'PAGE_UP': 33, 'PAGE_DOWN': 34, 'END': 35, 'HOME': 36, 'LEFT_ARROW': 37, 'UP_ARROW': 38,
		    'RIGHT_ARROW': 39, 'DOWN_ARROW': 40, 'INSERT': 45, 'DELETE': 46, 'HELP': 47, 'LEFT_WINDOW': 91, 'RIGHT_WINDOW': 92,
		    'SELECT': 93, 'NUMPAD_0': 96, 'NUMPAD_1': 97, 'NUMPAD_2': 98, 'NUMPAD_3': 99, 'NUMPAD_4': 100, 'NUMPAD_5': 101,
		    'NUMPAD_6': 102, 'NUMPAD_7': 103, 'NUMPAD_8': 104, 'NUMPAD_9': 105, 'NUMPAD_MULTIPLY': 106, 'NUMPAD_PLUS': 107,
		    'NUMPAD_ENTER': 108, 'NUMPAD_MINUS': 109, 'NUMPAD_PERIOD': 110, 'NUMPAD_DIVIDE': 111, 'F1': 112, 'F2': 113, 'F3': 114,
		    'F4': 115, 'F5': 116, 'F6': 117, 'F7': 118, 'F8': 119, 'F9': 120, 'F10': 121, 'F11': 122, 'F12': 123, 'F13': 124, 
		    'F14': 125, 'F15': 126, 'NUM_LOCK': 144, 'SCROLL_LOCK': 145 }
    });

    /******************** timer **************************/
    var timer = __modules__['timer'] = new Module('timer', 'built-in', {
	'setTimeout': window.setTimeout,
	'setInterval': window.setInterval,
	'clearTimeout': window.clearTimeout,
	'delay': function delay(f) {
	    var __method = f, args = array(arguments).slice(1), timeout = args.shift() * 1000;
	    return window.setTimeout(function() { return __method.apply(__method, args); }, timeout);
	},
	'defer': function defer(f) {
	    var args = [0.01].concat(array(arguments).slice(1));
	    return this.delay(f, args);
	}
    });

    /******************** ajax **************************/
    var activeRequestCount = 0;

    var Responders = {
	responders: [],
	'register': function register(responder) {
	    if (this.responders.indexOf(responder) != -1)
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

    Responders.register({
        'onCreate': function onCreate() { activeRequestCount++ },
        'onComplete': function onComplete() { activeRequestCount-- }
    });

    //TODO: armar algo para podes pasar parametros.
    var Base = type('Base', {
	'__init__': function __init__(options) {
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
		this.options.parameters = this.options.parameters.to_query_params();
	},
	
	'serialize': function serialize(object){
	    //TODO:Serializar
	    return;
	}
    });

    var Request = type('Request', Base, {
	_complete: false,

	'__init__': function __init__(url, options) {
	    super(Base, this).__init__(options);
	    this.transport = sys.get_transport();
	    this.request(url);
	},

	'request': function request(url) {
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

    var Response = type('Response', {
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

    var ajax = __modules__['ajax'] = new Module('ajax', 'built-in', {
	'Request': Request,
	'Response': Response
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
	if (!isinstance(selectorGroups, String))
	    return decorate_elements([selectorGroups])[0];
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
	    return (cache[ cacheKey ] = decorate_elements(elements.slice(0)));
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

	return ( cache[ cacheKey ] = decorate_elements(elements.slice(0)));
    }

    function query_combinator( l, r, c ) {
	var result = [], 
	    uids = {}, 
	    proc = {}, 
	    succ = {}, 
	    fail = {}, 
	    combinatorCheck = simple_selector.combinator[c];
		
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
		testFuncScope = simple_selector.attribute;	
		testFunc = testFuncScope[ testFuncKey ];
		persistCache[ aTest ] = [ testFuncKey, testFuncScope ].concat( testFuncArgs );
	    } else { // pseudo
		var pa = aTest.match( reg.pseudoArgs );
		testFuncArgs[ 1 ] = pa ? pa[ 1 ] : "";
		testFuncKey = aTest.match( reg.pseudoName )[ 1 ];
		testFuncScope = simple_selector.pseudos;
		
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
    var simple_selector = {
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

    function decorate_elements(elements) {
	var decorated = [];
	//Decorando los elementos
	for each (var element in elements) {
	    if (!element.tagName) continue;
	    var name = element.tagName.toLowerCase();
	    if (name in TagNames)
		extend(element, TagNames[name]);
	    if (element.elements && element.elements.length != 0)
		decorate_elements(element.elements);
	    decorated.push(element);
	}
	return decorated;
    }

    var TagNames = {};
    TagNames['form'] = {
	'disable': function() {
	    array(this.elements).forEach(function(e) {e.disable();});
	},
	'enable': function() {
	    array(this.elements).forEach(function(e) {e.enable();});
	},
	'serialize': function() {
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
    };
    
    TagNames['input'] = TagNames['select'] = TagNames['textarea'] = {
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
	    return Serializers[method](this);
	},

	set_value: function(value) {
	    var method = this.tagName.toLowerCase();
	    Serializers[method](this, value);
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

    var Serializers = {
	input: function(element, value) {
	    switch (element.type.toLowerCase()) {
	    case 'checkbox':
	    case 'radio':
		return this.inputSelector(element, value);
	    default:
		return this.textarea(element, value);
	    }
	},

	inputSelector: function(element, value) {
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
		'selectOne' : 'selectMany'](element);
	    else {
	    var opt, currentValue, single = type(value) != Array;
	    for (var i = 0, length = element.length; i < length; i++) {
		opt = element.options[i];
		currentValue = this.optionValue(opt);
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

	selectOne: function(element) {
	    var index = element.selectedIndex;
	    return index >= 0 ? this.optionValue(element.options[index]) : null;
	},

	selectMany: function(element) {
	    var values, length = element.length;
	    if (!length) return null;

	    for (var i = 0, values = []; i < length; i++) {
	    var opt = element.options[i];
	    if (opt.selected) values.push(this.optionValue(opt));
	    }
	    return values;
	},

	optionValue: function(opt) {
	    return opt.hasAttribute('value') ? opt.value : opt.text;
	}
    };
    // Primer cambio
    var dom = __modules__['dom'] = new Module('dom', 'built-in', {
	'query': query, 
	'query_combinator': query_combinator,
	'query_selector': query_selector,
	'simple_selector': simple_selector
    });

    /******************** main **************************/
    var main = __modules__['__main__'] = new Module('__main__','built-in', {'__builtins__': {}, '__doc__': "Welcome to protopy" });
    
    /******************** builtin **************************/
    var builtin = __modules__['__builtin__'] = new Module('__builtin__','built-in', {
        '$P': __publish__,
        '$L': __load__,
        '$B': __builtins__,
	'$D': __doc__,
	'$Q': query,
	'object': object,
	'type': type,
	'extend': function extend() {return __extend__.apply(this, [false].concat(array(arguments)));},
	'ls': function ls(obj){ return keys(__modules__[(obj && obj['__name__']) || this['__name__']]); },
	'locals': function locals(){ return __modules__[this['__name__']]; },
	'globals': function globals(){ return __modules__['__main__']; }
    });
    /******************** POPULATE **************************/
    __extend__(true, window, main);
    __builtins__(builtin);
    __builtins__(exception);

    // ******************************* MORE BUILTINS ************************************* //
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

    function isinstance(object, _type) {
	if (_type && type(_type) != Array) _type = [_type];
	if (!_type || (type(_type) == Array && _type[0] == undefined))
	    // end of recursion
	    return false;
	else {
	    var others = [];
	    for each (var t in _type) {
		if (type(object) == t) return true;
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
	
	'__iter__' : function(){
            for each (var arg in this.collect)
                yield arg;
        },

	'__len__' : function __len__(){
            return len(this.collect);
        },

    '_populate': function _populate() {
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

    var Template = type('Template', {
        //Static
        'pattern': /(^|.|\r|\n)(%\((.+?)\))s/,
    },{
	//Prototype
	'__init__': function __init__(template, pattern) {
	    this.template = str(template);
	    this.pattern = pattern || Template.pattern;
	},

	'evaluate': function evaluate(object) {
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
    id.__doc__ = "I'm sorry";

    function getattr(object, name, def) {
	//TODO: validar argumentos
        var attr = null;
        if (object) {
            attr = object[name];
            if (typeof(attr) !== 'undefined') {
                if (type(attr) == Function && typeof(attr['__new__']) === 'undefined') {
                    var method = attr, obj = object;
                    return function() { return method.apply(obj, array(arguments)); }
                } else {
                    return attr;
                }
            }
        }
        if (typeof(def) === 'undefined')
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

    //Populate builtins
    $B({
        'super': super,
        'isinstance': isinstance,
        'issubclass': issubclass,
        'Arguments': Arguments,
        'Template': Template,
	'hash': hash,
        'id': id,
	'getattr': getattr,
	'setattr': setattr,
	'hasattr': hasattr,
        'assert': function assert( test, text ) {
            if ( test === false )
                throw new AssertionError( text || 'An assertion failed!');
            return test;
        },
        'bool': function bool(object) {
            if (object && callable(object['__nonzero__']))
                return object.__nonzero__();
            if (object && type(object) == Array)
                return object.length != 0;
            if (object && type(object) == Object)
                return keys(object).length != 0;
            return Boolean(object);
        },
        'callable': function callable(object) {
            return object && type(object) == Function;
        },
        'chr': function chr(number){ 
	    if (type(number) != Number) throw new TypeError('An integer is required');
	    return String.fromCharCode(number);
        },
        'ord': function ord(ascii) {
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
        'equal': function equal(object1, object2) {
            if (callable(object1['__eq__'])) return object1.__eq__(object2);
            return object1 == object2;
        },
        'nequal': function nequal(object1, object2) {
            if (callable(object1['__ne__'])) return object1.__ne__(object2);
            return object1 != object2;
        },
        'filter': function filter(func, sequence) { 
    
        },
        'float': function float(value) {
            if (isinstance(value, String) || isinstance(value, Number)) {
		var number = Number(value);
		if (isNaN(number))
		    throw new ValueError('Invalid literal');
		return number;
	    }
	    throw new TypeError('Argument must be a string or number');
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
            if (isinstance(value, String) || isinstance(value, Number)) {
		var number = Math.floor(value);
		if (isNaN(number))
		    throw new ValueError('Invalid literal');
		return number;
	    }
	    throw new TypeError('Argument must be a string or number');
        },
        'len': function len(object) {
            if (object && callable(object['__len__']))
                return object.__len__();
            if (object['length'] != undefined) 
                return object.length;
            if (object && type(object) == Object) 
                return keys(object).length;
            throw new TypeError("object of type '" + type(object) + "' has no len()");
        },
        'array': function array(iterable) {
            if (!iterable) 
                return [];
            if (callable(iterable['__iterator__'])) 
                return [e for each (e in iterable)];
            if (iterable.length != undefined)
                return Array.prototype.slice.call(iterable);
        },
        'mult': function mult(array, value) {
            var result = [];
            for (var i = 0; i < value; i++)
                result = result.concat(array);
            return result;
        },
        'print': window.console && window.console.log || function(){},
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
            if (object && callable(object['__str__'])) 
                return object.__str__();
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
        'zip': function zip(){
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
    
    // WHERE
    var scripts = dom.query('script');
    for each (var script in scripts) {
	if (script.src) {
	    var m = script.src.match(new RegExp('^.*' + location.host + '/?(.*)/?protopy.js$', 'i'));
	    if (m) sys.base_url = m[1];
	}
    }
    __paths__[''] = sys.base_url + '/packages/';
})();

// ******************************* EXTENDING JAVASCRIPT ************************************* //
(function(){
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
	    if (args[0] && (type(args[0]) == Object || isinstance(args[0], object)))
                string = new Template(string, args[1]).evaluate(args[0]);
	    else
                string = string.gsub(/%s/, function(match) { 
                    return (args.length != 0)? str(args.shift()) : match[0]; 
                });
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
	    return this.replace(new RegExp(sys.ScriptFragment, 'img'), '');
	},

	'extract_scripts': function extract_scripts() {
	    var matchAll = new RegExp(sys.ScriptFragment, 'img');
	    var matchOne = new RegExp(sys.ScriptFragment, 'im');
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
	    array(div.childNodes).reduce(function(memo, node) { return memo + node.nodeValue }, '') :
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
		} else hash[key] = value;
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
	if (callable(replacement)) 
	    return replacement;
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
//More Data types
(function(){
    var Dict = type('Dict', [object], {
        '__init__': function __init__(object) {
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

        '__nonzero__': function __nonzero__(){
            return bool(this._key);
        },

        '__len__': function __len__() {
            return len(this._key);
        },

        'set': function set(key, value) {
            var hash = id(key);
            this._key[hash] = key;
            return this._value[hash] = value;
        },

        'setdefault': function setdefault(key, value){
            var ret = this.get(key);
            if (ret) 
		return ret;
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

        'values': function values() {
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
    
    // These are some simple yet useful aliases, there are most likely to be
    // used with DOM and Peppy boilerplate code
    $B({'$f': function (a){return a[0]}, // first item
        '$l': function (a){return a[a.length -1]} // last item
    });
})();