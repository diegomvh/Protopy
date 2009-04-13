var RESERVED_CHARS = "!*'();:@&=+$,/?%#[]";

var absolute_http_url_re = RegExp("^https?://", 'i');

var Http404 = type('Http404', Exception, {});

/*A basic HTTP request.*/
var HttpRequest = type ('HttpRequest', {

    __init__: function __init__() {
        this.GET = {};
	this.POST  = {};
	this.COOKIES = {};
	this.META = {};
	this.FILES = {};
        this.pathname = '';
        this.method = null;
	this.host = window.location.host;
	this.protocol = window.location.protocol;
    },

    get_full_path: function get_full_path() {
        return '';
    },

    build_absolute_uri: function build_absolute_uri(location) {
        if (!location)
            location = this.get_full_path();
        if (!absolute_http_url_re.match(location)) {
	    var current_uri = '%s//%s%s'.subs(this.protocol, this.host, this.path);
            //TODO: algo para unir urls, quiza tocando un poco module_url
	    location = current_uri + location;
	}
	return location;
    },

    is_secure: function is_secure(){
        return this.protocol == "https:";
    },

    is_ajax: function is_ajax() {
        return this.META['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest';
    },
    
    valid: function valid() {
	return !!this.pathname;
    },
});

/* A basic HTTP response, with content and dictionary-accessed headers.*/
var HttpResponse = type('HttpResponse', {
    status_code: 200,

    __init__: function __init__(content, status, content_type) {
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
        if (status)
            this.status_code = status;

        this._headers = {'content-type': ['Content-Type', content_type]};
    },

    __str__: function __str__() {
        /*Full HTTP message, including headers.*/
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

    //TODO: A better name
    render: function render() {
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

$P({
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