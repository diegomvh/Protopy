/* 'HTML utilities suitable for global use.' */
require('dom');
require('event');
require('ajax');
require('sys');
require('urls');
require('doff.utils.http');
//http://www.contentwithstyle.co.uk/content/fixing-the-back-button-and-enabling-bookmarking-for-ajax-apps

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
        this.head = document.createElement('div');
        this.head.id = "head";
        this.body = document.createElement('div');
        this.body.id = "body";
        // Apagando la chache del selector
        dom.cache(false);
        $$('body')[0].update('');
        $$('body')[0].insert(this.head);
        $$('body')[0].insert(this.body);
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
    }
});

var DOMAdapter = type('DOMAdapter', [ object ], {
    __init__: function() {
        this._handlers = [];
        this._current_url = urls.parse(urls.resolve('/', string(window.location)));
        //TODO: esta depende de por donde arranque.
        //this._current_url = this._root_url;
        this.history = new History();
        this.document = new Document();
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
        //urls.relative(location.href, 'http://localhost:8000/trabajo_offline/')
        //urls.resolve('/', location.href)
        //"http://localhost:8000/"
        //urls.resolve('/pepe/', location.href)
        return urls.parse(urls.resolve(url_string, string(this._current_url)));
    },

    _build_request: function(url) {
        return new http.HttpRequest(url);
    },

    _process_request: function(request) {
        //Te queres ir?
        //if (!request.is_valid()) return;
        if (!request.is_same_origin(this._root_url))
            window.location = string(request.URL);
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
        request[form.method] = form.serialize();
        this._process_request(request);
    },

    _process_from_links: function(e) {
        event.stopEvent(e);
        var url = this._build_url(e.currentTarget.getAttribute('href'));
        var request = this._build_request(url);
        request.method = 'get';
        this._process_request(request);
    },
    
    _process_from_string: function(s) {
        var url = this._build_url(s);
        var request = this._build_request(url);
        request.method = 'get';
        this._process_request(request);
    },

    _process_from_history: function(url) {
        this._current_url = url;
        this.send(this._build_request(url));
    },

    set location(value) {
        this._process_from_string(value);
    }
});

publish({
    DOMAdapter: DOMAdapter
});