require('event');
require('ajax');
require('sys');
require('urls');
require('doff.utils.http');

var History = type('History', [ object ], {
    __init__: function() {
        this.states = {};
        this.current = location.hash.slice(1);
        this.thread = window.setInterval(getattr(this, '_hash_check'), 50);
    },

    _hash_check: function() {
        var newHash = location.hash.slice(1);
        if (newHash !== this.current && !isundefined(this.states[newHash])) {
            this.current = newHash;
            this.onChange(this.states[this.current]);
        }
    },

    onChange: function(object) {},

    navigate: function (state, object) {
        this.states[this.current = state] = object;
        location.hash = state;
    },

    back: function() {
        history.back();
    },

    forward: function() {
        history.forward();
    }
});

var Document = type('Document', [ object ], {
    __init__: function() {
        this.html = document.getElementsByTagName('html')[0];
        this.head = document.createElement('head');
        this.head.id = "doff-head";
        this.body = document.getElementsByTagName('body')[0];
        
        // Apagando la chache del selector
        sys.selectorCacheOn = false;
        this.body.update('');
        document.getElementsByTagName('html')[0].insert(this.head);
    },

    update: function(content) {
        var head = content.match(new RegExp('<head[^>]*>([\\S\\s]*?)<\/head>', 'im'));
        if (head)
            this.head.update(head[1]);
        var body = content.match(new RegExp('<body[^>]*>([\\S\\s]*?)<\/body>', 'im'));
        if (body) {
            this.body.update(body[1]);
        } else 
            this.body.update(content);
        this.forms = this.body.select('FORM');
        this.links = this.body.select('A');
    },
    
    getElementsByClassName: function(name) {
        return this.html.getElementsByClassName(name);
    },
    
    getElementsByTagName: function(name) {
        if (name == "head")
            return [ this.head ];
        if (name == "body")
            return [ this.body ];
        return this.html.getElementsByTagName(name);
    },
    
    getElementById: function(id){
        return document.getElementById(id);
    }
});

var DOMAdapter = type('DOMAdapter', [ object ], {
    __init__: function() {
        this._handlers = [];
        this._current_url = urls.parse(urls.resolve('/', string(window.location)));
        this.history = new History();
        this.document = new Document();
        
        this.document.update(loading);
        
        event.connect(this.history, 'onChange', this, '_process_from_history');
    },

    // Eventos para emular window
    load: function() {},
    
    // Para conectar con el handler
    send: function(request) {},

    receive: function(response) {
        if (response.status_code == 200) {
            this.remove_hooks();
            this.document.update(response.content);
            this.load();
            this.add_hooks();
        } else if (response.status_code == 302 || response.status_code == 301) {
            return this._process_from_string(response['Location']);
        } else if (response.status_code == 404) {
            //Agregar a las url no manjeadas
            //value.setOpacity(0.2);
            return this.document.update(response.content);
        }
    },

    add_hooks: function() {
        var self = this;
        this.document.forms.forEach(function(f) {
            self._handlers.push(event.connect(f, 'onsubmit', getattr(self, '_process_from_forms')));
        });
        this.document.links.forEach(function(l) {
            self._handlers.push(event.connect(l, 'onclick', getattr(self, '_process_from_links')));
        });
    },

    remove_hooks: function() {
        this._handlers.forEach(function(hler) {
            event.disconnect(hler);
        });
        if (!isundefined(this.load._listeners) && isinstance(this.load._listeners, Array))
        	delete this.load._listeners;
    },

    _path_to_state: function(path) {
        var state = path;
        if (state.startswith('/'))
            state = state.slice(1);
        if (state.endswith('/'))
            state = state.slice(0, -1);
        return state || 'index';
    },

    _build_url: function(url_string) {
        return urls.parse(urls.resolve(url_string, string(this._current_url)));
    },

    _build_request: function(url) {
        return new http.HttpRequest(url);
    },

    _process_request: function(request) {
        if (!request.is_same_origin(this._root_url)) {
            window.location = string(request.URL);
            return;
        }
        this.history.navigate(this._path_to_state(request.path), request.URL);
        this._current_url = request.URL;
        this.send(request);
    }, 

    _process_from_forms: function(e) {
        event.stopEvent(e);
        var form = e.currentTarget;
        var url = this._build_url(form.getAttribute('action'));
        var request = this._build_request(url);
        request.method = form.method;
        request[request.method] = form.serialize();
        this._process_request(request);
    },

    _process_from_links: function(e) {
        event.stopEvent(e);
        var url = this._build_url(e.currentTarget.getAttribute('href'));
        var request = this._build_request(url);
        request.method = 'GET';
        this._process_request(request);
    },

    _process_from_string: function(s) {
        var url = this._build_url(s);
        var request = this._build_request(url);
        request.method = 'GET';
        this._process_request(request);
    },

    _process_from_history: function(url) {
        this._current_url = url;
        this.send(this._build_request(url));
    },

    set location(value) {
        this._process_from_string(value);
    },

    get location() {
        var result = {};
        for each (var name in [ 'host', 'port', 'protocol'])
            result[name] = this._current_url[name];
        result['hash'] = this._current_url['anchor']? "#" + this._current_url['anchor'] : "";
        result['hostname'] = this._current_url['domain'];
        result['href'] = this._current_url['url'];
        result['pathname'] = this._current_url['path'];
        result['search'] = this._current_url['query']? "?" + this._current_url['query'] : "";
        return result;
    },
});

publish({
    DOMAdapter: DOMAdapter
});