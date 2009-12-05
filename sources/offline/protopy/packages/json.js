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

Date.prototype.__json__ = function() {
	return '"%04d-%02d-%02d %02d:%02d:%02d"'.subs(	this.getFullYear(), 
			this.getUTCMonth() + 1,  // JavaScript reports January as year 0
			this.getUTCDate(), 
			this.getUTCHours(), 
			this.getUTCMinutes(), 
			this.getUTCSeconds());
}

var stringify = function (value) {

    switch (typeof value) {
        case 'undefined':
        case 'unknown': return;
        case 'function':  return value.toSource(); /* no lo veo util, pero bueno vemos que pasa */
        case 'boolean': return value.toString();
    }

    if (value === null) return 'null';
    if (callable(value.__json__)) return value.__json__();
    if (Element.isElement(value)) return;

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
}

var parse = function (value, sanitize) {
    value = value.replace(/^\/\*-secure-([\s\S]*)\*\/\s*$/, "$1");
    try {
        if(!sanitize || value.isJSON())
            var data = eval('(' + value + ')');
            return data;
    } catch(e){ 
        throw new SyntaxError('Badly formed JSON string: ' + value + " ... " + (e ? e.message : '')); 
    }
}

publish({
    stringify: stringify,
    parse: parse
});