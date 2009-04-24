$L('sys');
$L('event');
$L('doff.core.exceptions');
$L('doff.core.urlresolvers');
$L('doff.core.http');

var elements = {
    'DEFAULT': function DEFAULT(request, obj) {
	if (type(obj) == String) {
	    //TODO: trabajar la cadena para tratar mas casos, ej, http://www.google.com, https://algo.com/ruta/recurso.js
	    request.pathname = obj;
	    request.method = 'get';
	}
	return request;
    },
    'form': function form(request, element) {
	//TODO: manejar merjor el acciont para ver para donde salen disparados, por si se van del dominio.
	var f = $Q(element);
	request.method = f.method;
	request.pathname = element.action.slice(len(request.build_absolute_uri()));
	request[f.method] = f.serialize();
	return request;
    },

    'a': function a(request, element) {
	request.pathname = element.pathname;
	request.hostname = element.hostname;
	request.protocol = element.protocol;
	request.method = 'get';
	return request;
    },
}

var Handler = type('Handler', [ object ], {
    handle: function handle(element) {
	var request = new http.HttpRequest();
	if (element.tagName) {
	    var name = element.tagName.toLowerCase();
	    if (callable(elements[name]))
		request = elements[name](request, element);
	    else 
		throw new NotImplementedError('%s not implemented'.subs(name));
	} else {
	    request = elements['DEFAULT'](request, element);
	}
	if (request.valid())
	    this.execute(request);
	return false;
    },

    __init__: function(urlconf) {
        //TODO: pasar la url
        this._resolver = new urlresolvers.RegexURLResolver('^/', urlconf);
    },

    get_response: function(request){
        try {
            var [callback, callback_args, callback_kwargs] = this._resolver.resolve(request.pathname);
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

$P({Handler: Handler});