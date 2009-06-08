var RESERVED_CHARS = "!*'();:@&=+$,/?%#[]";

var absolute_http_url_re = RegExp("^https?://", 'i');

var Http404 = type('Http404', Exception);

//Parsers para armar el request
function parse_uri(str) {
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
};


/*A basic HTTP request.*/
var HttpRequest = type ('HttpRequest', [ object ], {

    __init__: function __init__(uri) {
        this.GET = {};
	this.POST  = {};
	this.COOKIES = {};
	this.META = {};
	this.FILES = {};
        extend(this, parse_uri(uri));
    },

    get_full_path: function() {
        return '';
    },
	
    get_host: function(){
	return '%s%s'.subs(this.host, (this.port) ? ':' + this.port : ''); 
    },

    build_absolute_uri: function(location) {
        if (!location)
            location = this.get_full_path();
        if (!absolute_http_url_re.test(location)) {
	    var current_uri = '%s://%s%s'.subs(this.protocol, this.get_host(), this.path);
            //TODO: algo para unir urls, quiza tocando un poco module_url
	    location = current_uri + location;
	}
	return location;
    },

    is_secure: function(){
        return this.protocol == "https";
    },

    is_same_origin: function() {
        var m = '%s//%s'.subs(this.protocol, this.get_host());
        return !m || (m == '%(protocol)s//%(domain)s%(port)s'.subs({
            protocol: location.protocol,
            domain: document.domain,
            port: location.port ? ':' + location.port : ''
        }));
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

    set post(value) {
	this.POST = value;
    },

    get post() {
	return this.POST;
    },

    set get(value) {
	this.GET = value;
    },
    
    get get() {
	return this.GET;
    },
});

/* A basic HTTP response, with content and dictionary-accessed headers.*/
var HttpResponse = type('HttpResponse', object, {
    status_code: 200,

    __init__: function __init__(content, content_type) {
	content = content || '';
        if (!content_type)
            content_type = "%s; charset=%s".subs('text/html', 'utf-8');
        if (!isinstance(content, String) && hasattr(content, '__iter__')) {
            this._container = array(content);
            this._is_string = false;
        } else {
            this._container = [content];
            this._is_string = true;
	}
        this.cookies = {};

        this._headers = {'content-type': ['Content-Type', content_type]};
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

    set_cookie: function set_cookie(key, value, max_age, expires, path, domain, secure) {
        this.cookies[key] = value || '';
	//TODO: logica de cookies
        if (max_age != undefined)
            this.cookies[key]['max-age'] = max_age;
        if (expires != undefined)
            this.cookies[key]['expires'] = expires;
        if (path != undefined)
            this.cookies[key]['path'] = path || '/';
        if (domain != undefined)
            this.cookies[key]['domain'] = domain;
        if (secure)
            this.cookies[key]['secure'] = true;
    },

    delete_cookie: function delete_cookie(key, path, domain) {
        this.set_cookie(key, null, 0, path || '/', domain, 'Thu, 01-Jan-1970 00:00:00 GMT', false);
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
    HttpResponseServerError: HttpResponseServerError
});