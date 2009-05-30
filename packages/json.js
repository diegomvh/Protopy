String.prototype.__json__ = function() { 
    return this.inspect(true); 
}
String.prototype.isJSON = function(){
    var testStr = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(testStr);
}
Number.prototype.__json__ = function() { 
    return isFinite(this) ? this.toString() : 'null'; 
}

var date_encoding;

Date.prototype.__json__ = function() {
    switch(date_encoding) {
	case 'classHinting': //{"__jsonclass__":["constructor", [param1,...]], "prop1": ...}
	    return '{"__jsonclass__":["Date",[' + this.valueOf() + ']]}';
	case '@timestamp@':
	case '@ticks@':
	    return '"@' + this.valueOf() + '@"';
	case 'ASP.NET':
	    return '"\\/Date(' + this.valueOf() + ')\\/"';
	default:
	return '"' + this.toISO8601() + '"';
    }
}

var stringify = function (value) {

    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return value.toString();
    }

    if (value === null) return 'null';
    if (callable(value.__json__)) return value.__json__();
    if (Element.iselement(value)) return;

    var results = [];
    if (isinstance(value, Array)) {
	for each (var v in value)
	    results.push(stringify(v));
	return '[' + results.join(', ') + ']';
    } else if (isinstance(value, Object)) {
	for (var property in value) {
	    var v = stringify(value[property]);
	    if (!isundefined(v))
		results.push(stringify(property) + ': ' + v);
	}
	return '{' + results.join(', ') + '}';
    }
};

var parse = function (value, sanitize) {
    value = value.replace(/^\/\*-secure-([\s\S]*)\*\/\s*$/, "$1");
    try {
	if(!sanitize || value.isJSON())
	    return eval('(' + value + ')');
    }
    catch(e){ 
	throw new SyntaxError('Badly formed JSON string: ' + value + " ... " + (e ? e.message : '')); 
    }
}

publish({ 
    date_encoding: date_encoding,
    stringify: stringify, 
    parse: parse 
});