require('sys');
require('event');
require('dom');
require('doff.core.exceptions');
require('doff.core.urlresolvers');
require('doff.core.http');

var Handler = type('Handler', object, {
    _events_handlers: [],
    _element_event: {'FORM': 'onsubmit', 'A': 'onclick'},
    __init__: function(urlconf, target) {
        this.target = target;
        this._resolver = new urlresolvers.RegexURLResolver('^/', urlconf);
    },

    handle: function handle(value) {
	var request = new http.HttpRequest();
	if (Element.isElement(value)) {
            //Es un elemento del html
	    var name = 'parse_' + value.tagName.toLowerCase();
	    if (callable(this[name]))
		request = this[name](request, value);
	    else 
		throw new NotImplementedError('%s not implemented'.subs(name));
	} else if (isinstance(value, String)) {
            //Es una cadena
            request = extend(request, this.parse_uri(value));
	} else if (!isundefined(value.target)) {
            //Es un evento
            event.stopEvent(value);
            return this.handle(value.target);
        }

	if (request.valid()) {
	    var response = this.get_response(request);
            //Trato el response
            if (response.status_code == 200) {
                this.clear_hooks();
                this.target.update(response.content);
                this.hook_events();
            } else if (response.status_code == 302) {
	        return this.handle(response['Location']);
            } else if (response.status_code == 404) {
                value.setOpacity(0.2);
	        return null;
            }
        }
    },

    get_response: function(request){
        try {
            var [callback, callback_args, callback_kwargs] = this._resolver.resolve(request.path);
            try {
		var args = [request];
		args = args.concat(callback_args);
		args.push(callback_kwargs);
                var response = callback.apply(this, args);
                return response;
            } catch (e) {
                print(e);
	    }
        } catch (e if isinstance(e, http.Http404)) {
            if (true) {/* (settings.DEBUG) estoy en debug hacer algo de debug */
                var d = require('doff.views.debug');
                return d.technical_404_response(request, e);
            } else {
                var [callback, param_dict] = this._resolver.resolve404();
                return callback(request, param_dict);
            }
	}
    },

    hook_events: function(){
        var self = this;
	var re = keys(this._element_event).reduce(
            function(previous, current) { return previous.concat(self.target.select(current)); }, []);
	re.forEach(function(e) {
            self._events_handlers.push(event.connect(e, self._element_event[e.tagName], getattr(self, 'handle')));
        });
    },

    clear_hooks: function(){
        this._events_handlers.forEach(function(hler) {
            event.disconnect(hler);
        });
        dom.clearCache();
    },

    //Parsers para armar el request
    parse_uri: function(str) {
        var options = {
            strictMode: false,
            key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
            q: {
                name:   "queryKey",
                parser: /(?:^|&)([^&=]*)=?([^&]*)/g
            },
            parser: {
                strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
                loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
            }
        }
        var	m   = options.parser[options.strictMode ? "strict" : "loose"].exec(str),
            uri = {},
            i   = 14;
    
        while (i--) 
            uri[options.key[i]] = m[i] || "";
    
        uri[options.q.name] = {};
        uri[options.key[12]].replace(options.q.parser, function ($0, $1, $2) {
            if ($1) 
                uri[options.q.name][$1] = $2;
        });
        return uri;
    },

    parse_form: function form(request, element) {
	request = extend(request, this.parse_uri(element.action));
        request.method = element.method;
	request[element.method] = element.serialize();
	return request;
    },

    parse_a: function a(request, element) {
        request = extend(request, this.parse_uri(element.href));
	request.method = 'get';
	return request;
    }
});

publish({
    Handler: Handler
});