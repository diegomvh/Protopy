require('sys');
require('event');
require('doff.core.exceptions');
require('doff.core.urlresolvers');
require('doff.utils.http');
require('doff.conf.settings', 'settings');

var LocalHandler = type('LocalHandler', [ object ], {
    response_fixes: [],
    __init__: function() {
        this.settings = settings;
        this.load_middleware();
        //Crear el resolver
        this._resolver = new urlresolvers.RegexURLResolver('^/', this.settings.ROOT_URLCONF);
    },

    load_middleware: function() {
        /*
        Populate middleware lists from settings.MIDDLEWARE_CLASSES.
        */
        require('doff.core.exceptions');
        this._view_middleware = [];
        this._response_middleware = [];
        this._exception_middleware = [];

        var request_middleware = [];
        for each (var middleware_path in this.settings.MIDDLEWARE_CLASSES) {
            var dot = middleware_path.lastIndexOf('.');
            if (dot == -1)
                throw new exceptions.ImproperlyConfigured('%s isn\'t a middleware module'.subs(middleware_path));
            var [ mw_module, mw_classname ] = [ middleware_path.slice(0, dot), middleware_path.slice(dot + 1)];
            try {
                var mod = require(mw_module);
            } catch (e if isinstance(e, LoadError)) {
                throw new exceptions.ImproperlyConfigured('Error importing middleware %s: "%s"'.subs(mw_module, e));
            }
            var mw_class = getattr(mod, mw_classname);
            if (isundefined(mw_class))
                throw new exceptions.ImproperlyConfigured('Middleware module "%s" does not define a "%s" class'.subs(mw_module, mw_classname));

            try {
                var mw_instance = new mw_class();
            } catch (e if isinstance(e, exceptions.MiddlewareNotUsed)) {
                continue;
            }

            if (hasattr(mw_instance, 'process_request'))
                request_middleware.push(mw_instance.process_request);
            if (hasattr(mw_instance, 'process_view'))
                this._view_middleware.push(mw_instance.process_view);
            if (hasattr(mw_instance, 'process_response'))
                this._response_middleware.unshift(mw_instance.process_response);
            if (hasattr(mw_instance, 'process_exception'))
                this._exception_middleware.unshift(mw_instance.process_exception);
        }
        // We only assign to this when initialization is complete as it is used
        // as a flag for initialization being complete.
        this._request_middleware = request_middleware;
    },

    send: function(responses) {},

    receive: function(request) {
        var response = this.get_response(request);

        // Apply response middleware
        for each (var middleware_method in this._response_middleware)
            response = middleware_method(request, response);
        response = this.apply_response_fixes(request, response);

        this.send(response);
    },

    get_response: function(request) {
        // Apply request middleware
        for each (var middleware_method in this._request_middleware) {
            var response = middleware_method(request);
            if (response)
                return response;
        }

        try {
            var [callback, callback_args, callback_kwargs] = this._resolver.resolve(request.path);

            // Apply view middleware
            for each (var middleware_method in this._view_middleware) {
                var response = middleware_method(request, callback, callback_args, callback_kwargs);
                if (response)
                    return (response);
            }

            try {
                var args = [request];
                args = args.concat(callback_args);
                args.push(callback_kwargs);
                var response = callback.apply(this, args);
            } catch (e) {
                // If the view raised an exception, run it through exception
                // middleware, and if the exception middleware returns a
                // response, use that. Otherwise, reraise the exception.
                for each (var middleware_method in this._exception_middleware)
                    var response = middleware_method(request, e);
                    if (response)
                        return response;
                throw e;
            }
            // Complain if the view returned None (a common error).
            if (isundefined(response)) {
                var view_name = callback.name // If it's a function
                throw new ValueError("The view %s didn't return an HttpResponse object.".subs(view_name));
            }
            return response;
        } catch (e if isinstance(e, http.Http404)) {
            if (this.settings.DEBUG) {
                var d = require('doff.views.debug');
                return d.technical_404_response(request, e);
            } else {
                var [callback, param_dict] = this._resolver.resolve404();
                return callback(request, param_dict);
            }
        }
    },

    apply_response_fixes: function(request, response) {
        /*
        Applies each of the functions in self.response_fixes to the request and
        response, modifying the response in the process. Returns the new
        response.
        */
        for each (var func in this.response_fixes)
            response = func(request, response);
        return response;
    }
});

publish({
    LocalHandler: LocalHandler
});