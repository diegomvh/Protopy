/**** expressionKeys
members of a parsed URI object that you get
from evaluting the strict regular expression.
*/
var expressionKeys = [
    "url",
    "protocol",
    "authorityRoot",
    "authority",
        "userInfo",
            "user",
            "password",
        "domain",
        "port",
    "path",
        "root",
        "directory",
        "file",
    "query",
    "anchor"
];

var queryExpression = /(?:^|&)([^&=]*)=?([^&]*)/g;        

/**** strictExpression
*/
var strictExpression = new RegExp( /* url */
    "^" +
    "(?:" +
        "([^:/?#]+):" + /* protocol */
    ")?" +
    "(?:" +
        "(//)" + /* authorityRoot */
        "(" + /* authority */
            "(?:" +
                "(" + /* userInfo */
                    "([^:@]*)" + /* user */
                    ":?" +
                    "([^:@]*)" + /* password */
                ")?" +
                "@" +
            ")?" +
            "([^:/?#]*)" + /* domain */
            "(?::(\\d*))?" + /* port */
        ")" +
    ")?" +
    "(" + /* path */
        "(/?)" + /* root */
        "((?:[^?#/]*/)*)" +
        "([^?#]*)" + /* file */
    ")" +
    "(?:\\?([^#]*))?" + /* query */
    "(?:#(.*))?" /*anchor */
);

/**** Parser
returns a URI parser function given
a regular expression that renders
`expressionKeys` and returns an `Object`
mapping all `keys` to values.
*/
var Parser = function (expression) {
    return function (url) {
        if (typeof url == "undefined")
            throw new Error("HttpError: URL is undefined");
        if (typeof url != "string") return new Object(url);

        var items = new Url();
        var parts = expression.exec(url);

        for (var i = 0; i < parts.length; i++) {
            items[expressionKeys[i]] = parts[i] ? parts[i] : "";
        }

        items.queryKey = {};
        items.query.replace(queryExpression, function ($0, $1, $2) {
            if ($1) items.queryKey[$1] = $2;
        });
        
        items.root = (items.root || items.authorityRoot) ? '/' : '';

        items.directories = items.directory.split("/");
        if (items.directories[items.directories.length - 1] == "") {
            items.directories.pop();
        }

        /* normalize */
        var directories = [];
        for (var i = 0; i < items.directories.length; i++) {
            var directory = items.directories[i];
            if (directory == '.') {
            } else if (directory == '..') {
                if (directories.length && directories[directories.length - 1] != '..')
                    directories.pop();
                else
                    directories.push('..');
            } else {
                directories.push(directory);
            }
        }
        items.directories = directories;

        items.domains = items.domain.split(".");

        return items;
    };
};
 
/**** parse
a strict URI parser.
*/
var parse = Parser(strictExpression);
 
/**** format
accepts a parsed URI object and returns
the corresponding string.
*/
var format = function (object) {
    if (typeof(object) == 'undefined')
        throw new Error("UrlError: URL undefined for urls#format");
    if (object instanceof String || typeof(object) == 'string')
        return object;
    var domain =
        object.domains ?
        object.domains.join(".") :
        object.domain;
    var userInfo = (
            object.user ||
            object.password
        ) ?
        (
            (object.user || "") +
            (object.password ? ":" + object.password : "")
        ) :
        object.userInfo;
    var authority = (
            userInfo ||
            domain ||
            object.port
        ) ? (
            (userInfo ? userInfo + "@" : "") +
            (domain || "") +
            (object.port ? ":" + object.port : "")
        ) :
        object.authority;
    var directory =
        object.directories ?
        object.directories.join("/") :
        object.directory;
    var path =
        directory || object.file ?
        (
            (directory ? directory + "/" : "") +
            (object.file || "")
        ) :
        object.path;
    return (
        (object.protocol ? object.protocol + ":" : "") +
        (authority ? "//" + authority : "") +
        (object.root || (authority && path) ? "/" : "") +
        ((path && path != "/") ? path : "") +
        (object.query ? "?" + object.query : "") +
        (object.anchor ? "#" + object.anchor : "")
    ) || object.url || "";
};
 
/**** resolveObject
returns an object representing a URL resolved from
a relative location and a base location.
*/
var resolveObject = function (relative, base) {
    if (!base)
        return relative;

    base = parse(base);
    relative = parse(relative);

    if (relative.url == "")
        return base;

    delete base.url;
    delete base.authority;
    delete base.domain;
    delete base.userInfo;
    delete base.path;
    delete base.directory;

    if (
        relative.protocol && relative.protocol != base.protocol ||
        relative.authority && relative.authority != base.authority
    ) {
        base = relative;
    } else {
        if (relative.root) {
            base.directories = relative.directories;
        } else {

            var directories = relative.directories;
            for (var i = 0; i < directories.length; i++) {
                var directory = directories[i];
                if (directory == ".") {
                } else if (directory == "..") {
                    if (base.directories.length) {
                        base.directories.pop();
                    } else {
                        base.directories.push('..');
                    }
                } else {
                    base.directories.push(directory);
                }
            }

            if (relative.file == ".") {
                relative.file = "";
            } else if (relative.file == "..") {
                base.directories.pop();
                relative.file = "";
            }
        }
    }

    if (relative.root)
        base.root = relative.root;
    if (relative.protcol)
        base.protocol = relative.protocol;
    if (!(!relative.path && relative.anchor))
        base.file = relative.file;
    base.query = relative.query;
    base.anchor = relative.anchor;

    return base;
};
 
/**** relativeObject
returns an object representing a relative URL to
a given target URL from a source URL.
*/
var relativeObject = function (target, base) {
    target = parse(target);
    base = parse(base);

    delete target.url;

    if (
        target.protocol == base.protocol &&
        target.authority == base.authority
    ) {
        delete target.protocol;
        delete target.authority;
        delete target.userInfo;
        delete target.user;
        delete target.password;
        delete target.domain;
        delete target.domains;
        delete target.port;
        if (
            !!target.root == !!base.root && !(
                target.root &&
                target.directories[0] != base.directories[0]
            )
        ) {
            delete target.path;
            delete target.root;
            delete target.directory;
            while (
                base.directories.length &&
                target.directories.length &&
                target.directories[0] == base.directories[0]
            ) {
                target.directories.shift();
                base.directories.shift();
            }
            while (base.directories.length) {
                base.directories.shift();
                target.directories.unshift('..');
            }

            if (!target.root && !target.directories.length && !target.file && base.file)
                target.directories.push('.');

            if (base.file == target.file)
                delete target.file;
            if (base.query == target.query)
                delete target.query;
            if (base.anchor == target.anchor)
                delete target.anchor;
        }
    }

    return target;
};

var Url = type('Url', [ object ], {
    __str__: function() {
        return this.url;
    },
    get host() {
        var host = this.domains.join('.');
        if (this.port)
            host = '%s:%s'.subs(host, this.port);
        return host;
    }/*
    get path() {
        var dir = this.domains.join('.');
        if (this.port)
            host = '%s:%s'.subs(host, this.port);
        return host;
    },*/
});

 
/**** resolve
returns a URL resovled to a relative URL from a base URL.
*/
var resolve = function (relative, base) {
    return format(resolveObject(relative, base));
};
 
/**** relative
returns a relative URL to a target from a source.
*/
var relative = function (target, base) {
    return format(relativeObject(target, base));
}

publish({
    Url: Url,
    parse: parse,
    format: format,
    resolve: resolve,
    resolveObject: resolveObject,
    relative: relative,
    relativeObject: relativeObject
});