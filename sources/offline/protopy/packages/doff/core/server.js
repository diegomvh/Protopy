require('sys');
require('event');
require('doff.core.exceptions');
require('doff.core.urlresolvers');

var Butler = type('Butler', [ object ], {
    __init__: function(urlconf) {
        //Crear el resolver
        this._resolver = new urlresolvers.RegexURLResolver('^/', urlconf);
    },

    send: function(responses){},

    receive: function(request) {
        var response = null;
        if (request.is_valid()) {
            var response = this.get_response(request);
        }
        if (response == null) {
            var d = require('doff.views.debug');
            response = d.technical_404_response(request, e);
        }
        this.send(response);
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
    }
});

publish({
    Butler: Butler
});