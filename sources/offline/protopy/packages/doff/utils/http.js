require('urls');

var RESERVED_CHARS = "!*'();:@&=+$,/?%#[]";

var absolute_http_url_re = RegExp("^https?://", 'i');

var Http404 = type('Http404', Exception);

/*A basic HTTP request.*/
var HttpRequest = type ('HttpRequest', [ object ], {

    __init__: function(url_object) {
        if (isinstance(url_object, String)) {
            url_object = urls.parse(url_object);
        }
        if (isinstance(url_object, urls.Url))
            this.URL = url_object;
        else
            throw new Exception('No url');
        this.GET = this.URL.queryKey;
        this.POST  = {};
        this.FILES = {};
    },

    get_cookie: function( cookie_name ) {
        var results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );

        if ( results )
            return ( unescape ( results[2] ) );
        else
            return null;
    },

    get_full_path: function() {
        return '';
    },
    
    get host() {
        if (this.URL.domain) {
            var host = this.URL.domain;
            if (this.URL.port)
                host = '%s:%s'.subs(host, this.URL.port);
        } else {
            var host = location.host;
        }
        return host;
    },
    
    get protocol() {
        return (this.URL.protocol)? this.URL.protocol : location.protocol.substr(0, location.protocol.length - 1);
    },
    
    get port() {
        return (this.URL.domain)? this.URL.port : location.port;
    },

    get path() {
        return this.URL.path;
    },

    build_absolute_uri: function(location) {
        if (!location)
            location = this.get_full_path();
        if (!absolute_http_url_re.test(location)) {
            var current_uri = '%s://%s%s'.subs(this.protocol, this.host, this.path);
            //TODO: algo para unir urls, quiza tocando un poco module_url
            location = current_uri + location;
        }
        return location;
    },

    is_secure: function(){
        return this.protocol == "https";
    },

    is_same_origin: function(base_url) {
        var m = '%s://%s'.subs(this.protocol, this.host);
        var other = (base_url)? '%s://%s'.subs(base_url.protocol, base_url.host) : '%(protocol)s//%(domain)s%(port)s'.subs({
                protocol: location.protocol,
                domain: location.hostname,
                port: location.port ? ':' + location.port : ''
                });
        return !m || (m == other);
    },

    is_ajax: function() {
        return this.META['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest';
    },
    
    is_valid: function() {
        return !!this.path;
    },

    set method(value) {
        this._method = value && value.toUpperCase();
    },
    
    get method() {
        return this._method;
    },
    
    get REQUEST() {
    	if (isundefined(this._REQUEST)) {
    		this._REQUEST = {};
    		extend(this._REQUEST, this.GET);
    		extend(this._REQUEST, this.POST);
    	}
    	return this._REQUEST;
    }

});

/* A basic HTTP response, with content and dictionary-accessed headers.*/
var HttpResponse = type('HttpResponse', object, {
    status_code: 200,

    __init__: function(content) {
        var arg = new Arguments(arguments, {mimetype:null, status:null, content_type:null});
        content = content || '';
    
        if (arg.kwargs['mimetype'])
            arg.kwargs['content_type'] = arg.kwargs['mimetype'];
        if (!arg.kwargs['content_type'])
            arg.kwargs['content_type'] = "%s; charset=%s".subs('text/html', 'utf-8');
        if (!isinstance(content, String) && hasattr(content, '__iter__')) {
            this._container = array(content);
            this._is_string = false;
        } else {
            this._container = [content];
            this._is_string = true;
        }
        this.cookies = {};
        if (arg.kwargs['status'])
            this.status_code = arg.kwargs['status'];

        this._headers = {'content-type': ['Content-Type', arg.kwargs['content_type']]};
    },

    __str__: function __str__() {
        return this.content;
    },

    has_header: function has_header(header) {
        return !!this._headers[header.toLowerCase()];
    },

    __contains__: this.has_header,

    items: function items() {
        return values(this._headers_);
    },

    get: function get(header, alternate) {
        return this._headers[header.toLowerCase()] || alternate;
    },

    set_cookie: function( key, value, max_age, expires, path, domain, secure ) {
        var cookie_string = key + "=" + escape ( value );
        if ( max_age )
            cookie_string += "; max-age=" + max_age;
        if ( expires )
            cookie_string += "; expires=" + expires.toGMTString();
        if ( path )
            cookie_string += "; path=" + escape ( path );
        if ( domain )
            cookie_string += "; domain=" + escape ( domain );
        if ( secure )
            cookie_string += "; secure";
        document.cookie = cookie_string;
    },

    delete_cookie: function( cookie_name ) {
        var cookie_date = new Date ();  // current date & time
        cookie_date.setTime ( cookie_date.getTime() - 1 );
        document.cookie = cookie_name += "=; expires=" + cookie_date.toGMTString();
    },

    get content() {
        return this._container.join('');
    },

    set content(value) {
        this._container = [value];
        this._is_string = true;
    },
    
    write: function write(content) {
        if (!this._is_string)
            throw new Exception("This %s instance is not writable".subs(this.__class__));
        this._container.push(content);
    }
});

var HttpResponseRedirect = type('HttpResponseRedirect', HttpResponse, {
    status_code: 302,

    __init__: function __init__(redirect_to) {
        super(HttpResponse, this).__init__();
        this['Location'] = redirect_to;
    }
});

var HttpResponsePermanentRedirect = type('HttpResponsePermanentRedirect', HttpResponseRedirect, {
    status_code: 301
});

var HttpResponseNotModified = type('HttpResponseNotModified', HttpResponse, {
    status_code: 304
});

var HttpResponseBadRequest = type('HttpResponseBadRequest', HttpResponse, {
    status_code: 400
});

var HttpResponseNotFound = type('HttpResponseNotFound', HttpResponse, {
    status_code: 404
});

var HttpResponseForbidden = type('HttpResponseForbidden', HttpResponse, {
    status_code: 403
});

var HttpResponseNotAllowed = type('HttpResponseNotAllowed', HttpResponse, {
    status_code: 405,
    
    __init__: function __init__(permitted_methods) {
        super(HttpResponse, this).__init__();
        this['Allow'] = permitted_methods.join(', ');
    }
});

var HttpResponseGone = type('HttpResponseGone', HttpResponse, {
    status_code: 410
});

var HttpResponseServerError = type('HttpResponseServerError', HttpResponse, {
    status_code: 500
});

publish({
    Http404: Http404,
    HttpRequest: HttpRequest, 
    HttpResponse: HttpResponse, 
    HttpResponseRedirect: HttpResponseRedirect,
    HttpResponsePermanentRedirect: HttpResponsePermanentRedirect, 
    HttpResponseNotModified: HttpResponseNotModified, 
    HttpResponseBadRequest: HttpResponseBadRequest, 
    HttpResponseNotFound: HttpResponseNotFound, 
    HttpResponseForbidden: HttpResponseForbidden, 
    HttpResponseNotAllowed: HttpResponseNotAllowed,
    HttpResponseGone: HttpResponseGone,
    HttpResponseServerError: HttpResponseServerError,
    absolute_http_url_re: absolute_http_url_re
});