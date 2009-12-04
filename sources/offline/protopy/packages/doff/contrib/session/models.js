require('doff.contrib.extradata.models', 'ExtraData');
require('doff.db.models.model', 'Model');
require('doff.conf.settings', 'settings');
require('md5', 'md5');
require('json');
var models = require('doff.db.models.base');

var MAX_SESSION_KEY = 73786976294838206464;			// 8 << 63 :P copion!!!

function dump_model(model) {
	return '{ "model": "' + string(model._meta) + '", "pk": "' + string(model.pk)+ '"}';
}

function load_model(model) {
	var Model = models.get_model_by_identifier(model["model"]);
	return Model.objects.get({'pk': model["pk"]});
}

function convert_value(object) {
	if (hasattr(object, 'model')) {
    	return load_model(object);
    } else if (isinstance(object, Array)) {
    	var results = [];
        for each (var v in object)
            results.push(convert_value(v));
        return results;
    } else if (isinstance(object, Object)) {
    	var results = {};
        for (var property in object)
            results[property] = convert_value(object[property]);
        return results;
    } else 
    	return object;
	
}

var dump_session = function (value) {
	switch (typeof value) {
        case 'undefined':
        case 'unknown': return;
        case 'function':  return value.toSource(); /* no lo veo util, pero bueno vemos que pasa */
        case 'boolean': return value.toString();
    }

    if (value === null) return 'null';
    if (callable(value.__json__)) return value.__json__();
    if (Element.isElement(value)) return;

    var results = [];
    if (isinstance(value, Model)) {
    	return dump_model(value);
    } else if (isinstance(value, Array)) {
        for each (var v in value)
            results.push(dump_session(v));
        return '[' + results.join(', ') + ']';
    } else if (isinstance(value, Object)) {
        for (var property in value) {
            var v = dump_session(value[property]);
            if (!isundefined(v))
                results.push(dump_session(property) + ': ' + v);
        }
        return '{' + results.join(', ') + '}';
    }
}

var Session = type('Session', [ Dict ], {
	get: function() {
		var kwargs = new Arguments(arguments).kwargs;
		try {
			// TODO: Si esta expirada no retornar nada
			var obj = ExtraData.objects.get({'name': 'Session', 'module': 'doff.contrib.session.models', 'key': kwargs['session_key']});
			var session_data = obj.data;
			var session = new Session(session_data.session_key);
			session.set_expiry(session_data.session_expiry);
			
			var keys = session_data.keys;
			for (var property in keys)
				keys[property] = convert_value(keys[property]);
			session._key = keys;
			var values = session_data.values;
			for (var property in values)
				values[property] = convert_value(values[property]);
			session._value = values;
			return session;
		} catch (e) {}
	}
}, {
	__init__: function(session_key) {
		super(Dict, this).__init__();
		this.session_key = isundefined(session_key) ? this._get_new_session_key() : session_key;
		
		this.modified = false;
		this.accessed = false;
	},
	
	__json__: function() {
		var data = { 'values': this._value, 'keys': this._key, 'session_key': this.session_key, 'session_expiry': this._session_expiry };
		return dump_session(data);
	},
	
	_get_new_session_key: function() {
		return md5("%s%s%s".subs(Math.floor(Math.random() * MAX_SESSION_KEY), window.navigator.userAgent, new Date().getTime()));
	},
	
	set_expiry: function(value) {
		if (isundefined(value) || value == null)
            // Remove any custom expiration for this session.
            this._session_expiry = null;
        this._session_expiry = value;
	},
	
	get_expire_at_browser_close: function() {
		if (this._session_expiry == null)
            return settings.SESSION_EXPIRE_AT_BROWSER_CLOSE;
        return this._session_expiry == 0;
	},
	
	get_expiry_age: function() {
        //Get the number of seconds until the session expires.
        var expiry = this._session_expiry;
        if (!expiry)   // Checks both None and 0 cases
            return settings.SESSION_COOKIE_AGE;
        if (!isinstance(expiry, Date))
            return expiry;
        var delta = new Date(expiry - new Date());
        return delta.getDay() * 86400 + delta.getSeconds();
	},
	
    get_expiry_date: function() {
        //Get session the expiry date (as a datetime object).
        var expiry = this._session_expiry;
        if (isinstance(expiry, Date))
            return expiry;
        if (!expiry)   // Checks both None and 0 cases
            var expiry = settings.SESSION_COOKIE_AGE;
        return new Date(new Date().getTime() + (expiry * 1000));
    },
    
    save: function() {
    	var ed = new ExtraData();
		ed.data = this;
		ed.key = this.session_key;
		ed.save();
    },
    
    flush: function() {
    	this.clear();
    	this.session_key = this._get_new_session_key();
    },
    
    cycle_key: function() {
    	this.modified = true;
    	this.session_key = this._get_new_session_key();
    },
    
    set: function(key, value) {
    	this.modified = true;
        return super(Dict, this).set(key, value);
    },
    setdefault: function(key, value){
    	this.modified = true;
    	return super(Dict, this).setdefault(key, value);
    },
    get: function(key, otherwise) {
    	this.accessed = true;
    	return super(Dict, this).get(key, otherwise);
    },
    unset: function(key) {
    	this.modified = true;
    	return super(Dict, this).unset(key);
    },
    keys: function() {
    	this.accessed = true;
    	return super(Dict, this).keys();
    },
    values: function() {
    	this.accessed = true;
    	return super(Dict, this).values();
    },
    items: function() {
    	this.accessed = true;
    	return super(Dict, this).items();
    },
    index: function(value) {
    	this.accessed = true;
    	return super(Dict, this).index(value);
    },
    update: function(object) {
    	this.modified = true;
    	return super(Dict, this).update(object);
    },
    pop: function(key) {
    	this.modified = true;
    	return super(Dict, this).pop(key);
    },
    popitem: function(key) {
    	this.modified = true;
    	return super(Dict, this).popitem(key);
    },
    clear: function() {
    	this.modified = true;
    	return super(Dict, this).clear();
    },
    has_key: function(key) {
    	this.accessed = true;
    	return super(Dict, this).has_key(key);
    }
});

publish({
	Session: Session
});