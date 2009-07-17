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

var date = {CLASSHINTING: 'classHinting',
            TIMESTAMP: '@timestamp@',
            TICKS: '@ticks@',
            'ASP.NET': 'ASP.NET',
            ISO8601: 'ISO8601' };

date['encoding'] = date.ISO8601;
date['decode'] = true;

Date.prototype.__json__ = function() {
    switch(date.encoding) {
	case 'classHinting':
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
};

var parse = function (value, sanitize) {
	value = value.replace(/^\/\*-secure-([\s\S]*)\*\/\s*$/, "$1");
    try {
    	if(!sanitize || value.isJSON())
    		data = eval('(' + value + ')');
    		if (date.decode)
    			data = decode_dates(data);
    		return data;
    } catch(e){ 
    	throw new SyntaxError('Badly formed JSON string: ' + value + " ... " + (e ? e.message : '')); 
    }
}

var decode_dates = function(obj) {
	//Ver que es el hasOwnProperty
	//var matches, useHasOwn = {}.hasOwnProperty ? true : false;
	var matches;	
	//Parse date strings
	if(isinstance(obj, String)) {
		//ISO8601
		if(matches = obj.match(/^(?:(\d\d\d\d)-(\d\d)(?:-(\d\d)(?:T(\d\d)(?::(\d\d)(?::(\d\d)(?:\.(\d+))?)?)?)?)?)$/)){
			obj = new Date(0);
			if(matches[1]) obj.setUTCFullYear(parseInt(matches[1]));
			if(matches[2]) obj.setUTCMonth(parseInt(matches[2]-1));
			if(matches[3]) obj.setUTCDate(parseInt(matches[3]));
			if(matches[4]) obj.setUTCHours(parseInt(matches[4]));
			if(matches[5]) obj.setUTCMinutes(parseInt(matches[5]));
			if(matches[6]) obj.setUTCMilliseconds(parseInt(matches[6]));
		}
		//@timestamp@ / @ticks@
		else if(matches = obj.match(/^@(\d+)@$/)){
			obj = new Date(parseInt(matches[1]))
		}
		//ASP.NET
		else if(matches = obj.match(/^\/Date\((\d+)\)\/$/)){
			obj = new Date(parseInt(matches[1]))
		}
	} else if(isinstance(obj, Object)) {
		//JSON 1.0 Class Hinting: {"__jsonclass__":["constructor", [param1,...]], "prop1": ...}
		if(!isundefined(obj.__jsonclass__) &&  isinstance(obj.__jsonclass__, Array)) {
			if(obj.__jsonclass__[0] == 'Date'){
				if(isinstance(obj.__jsonclass__[1], Array) && !isundefined(obj.__jsonclass__[1][0]))
					obj = new Date(obj.__jsonclass__[1][0]);
				else
					obj[key] = new Date();
			}
		}
	} else {
		for (var key in obj)
			obj[key] = decode_dates(obj[key]);
	}
	return obj;
};

publish({
	date: date,
    stringify: stringify,
    parse: parse
});