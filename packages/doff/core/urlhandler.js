require('sys');
require('event');
require('doff.core.exceptions');
require('doff.core.urlresolvers');
require('doff.core.http');

/*
 * parseUri 1.2.1
 * (c) 2007 Steven Levithan <stevenlevithan.com>
 * MIT License
 */
function parseUri (str) {
    var	o   = parseUri.options,
        m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i   = 14;

    while (i--) 
        uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) 
            uri[o.q.name][$1] = $2;
    });
    return uri;
};

parseUri.options = {
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
};


function string_url(request, str) {
    extend(request, parseUri(str));
    return request;
}

var html_elements = {
    'form': function form(request, element) {
	string_url(request, element.action);
        request.method = element.method;
	request[element.method] = element.serialize();
	return request;
    },

    'a': function a(request, element) {
        string_url(request, element.href);
	request.method = 'get';
	return request;
    },
}

var Handler = type('Handler', [ object ], {
    handle: function handle(element) {
	var request = new http.HttpRequest();
        //TODO: vero como determinar si es un elemento del html creo que es algo con el tipo de nodo debe ser 2
	if (element.tagName) {
	    var name = element.tagName.toLowerCase();
	    if (callable(html_elements[name]))
		request = html_elements[name](request, element);
	    else 
		throw new NotImplementedError('%s not implemented'.subs(name));
	} else {
	    request = string_url(request, element);
	}
	if (request.valid())
	    this.execute(request);
	return false;
    },

    __init__: function(urlconf) {
        this._resolver = new urlresolvers.RegexURLResolver('^/', urlconf);
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
            var [callback, param_dict] = this._resolver.resolve404();
            return callback(request, param_dict);
	}
    },

    execute: function execute(request) {
        var response = this.get_response(request);
        //TODO: A better name
        response.render();
    }
});

publish({
    Handler: Handler
});