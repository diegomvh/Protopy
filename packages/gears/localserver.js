var localServer = google.gears.factory.create('beta.localserver');

var GearsStore = type ('GearsStore', {
    version_url: "version.js",
    list_of_urls: [],
    refreshing: false,
    _store: null,
    _do_slurp: false,

    '__init__': function __init__(name, requiredCookie) {
	var name = name || window.location.href.replace(/[^0-9A-Za-z_]/g, "_");
	this._store = localServer.createStore(name, requiredCookie);
    },

    //Wrapper of resourceStore
    get name(){
	return this._store.name;
    },
    
    get required_cookie(){
	return this._store.requiredCookie;
    },

    get enabled(){
	return this._store.enabled;
    },

    set enabled( value ){
	this._store.enabled = value;
    },
   
    capture: function(urlOrUrlArray, completionCallback) {
	return this._store.capture(urlOrUrlArray, completionCallback);
    },
    
    abort_capture: function(captureId) {
	this._store.abortCapture(captureId);
    },

    remove: function(url) {
	this._store.remove(url);
    },

    rename: function(srcUrl, destUrl) {
	this._store.rename(srcUrl, destUrl);
    },
    
    copy: function(srcUrl, destUrl) {
	this._store.copy(srcUrl, destUrl);
    },
   
    is_captured: function(url) {
	return this._store.isCaptured(url);
    },

    capture_blob: function(blob, url, optContentType) {
	return this._store.captureBlob(blob, url, optContentType);
    },

    capture_file: function(fileInputElement, url) {
	return this._store.captureFile(fileInputElement, url);
    },

    get_captured_file_name: function(url) {
	return this._store.getCapturedFileName(url);
    },

    get_header: function(url, name) {
	return this._store.getHeader(url, name);
    },

    get_all_headers: function(url) {
	return this._store.getAllHeaders(url);
    },

    get_as_blob: function(url) {
	return this._store.getAsBlob(url);
    },

    create_file_submitter: function() {
	return this._store.createFileSubmitter();
    },

    slurp: function(){
	this._do_slurp = true;
    },
    
    refresh: function(callback){ 
	try{
	    this.refreshing = true;
	    if(this.version_url) {
		this._getVersionInfo(function(oldVersion, newVersion) {
		    if(!oldVersion || oldVersion != newVersion){
			this._do_refresh(callback, newVersion);
		    } else {
			callback(false, []);
		    }
		});
	    } else {
		this._doRefresh(callback);
	    }
	}catch(e){
	    this.refreshing = false;
	}
    },
	
    abort_refresh: function(){
	if(!this.refreshing){
	    return;
	}
	
	this._store.abort_capture(this._cancel_id);
	this.refreshing = false;
    },
    
    _do_refresh: function(callback, newVersion){
	var self = this;
	this._cancelID = this._store.capture(this.list_of_urls);
    },

    _slurp: function(){
	    if(!this._doSlurp){
		    return;
	    }
	    
	    var handleUrl = dojo.hitch(this, function(url){
		    if(this._sameLocation(url)){
			    this.cache(url);
		    }
	    });
	    
	    handleUrl(window.location.href);
	    
	    dojo.query("script").forEach(function(i){
		    try{
			    handleUrl(i.getAttribute("src"));
		    }catch(exp){
			    //console.debug("dojox.off.files.slurp 'script' error: " 
			    //				+ exp.message||exp);
		    }
	    });
	    
	    dojo.query("link").forEach(function(i){
		    try{
			    if(!i.getAttribute("rel")
				    || i.getAttribute("rel").toLowerCase() != "stylesheet"){
				    return;
			    }
		    
			    handleUrl(i.getAttribute("href"));
		    }catch(exp){
			    //console.debug("dojox.off.files.slurp 'link' error: " 
			    //				+ exp.message||exp);
		    }
	    });
	    
	    dojo.query("img").forEach(function(i){
		    try{
			    handleUrl(i.getAttribute("src"));
		    }catch(exp){
			    //console.debug("dojox.off.files.slurp 'img' error: " 
			    //				+ exp.message||exp);
		    }
	    });
	    
	    dojo.query("a").forEach(function(i){
		    try{
			    handleUrl(i.getAttribute("href"));
		    }catch(exp){
			    //console.debug("dojox.off.files.slurp 'a' error: " 
			    //				+ exp.message||exp);
		    }
	    });
	    
	    // FIXME: handle 'object' and 'embed' tag
	    
	    // parse our style sheets for inline URLs and imports
	    dojo.forEach(document.styleSheets, function(sheet){
		    try{
			    if(sheet.cssRules){ // Firefox
				    dojo.forEach(sheet.cssRules, function(rule){
					    var text = rule.cssText;
					    if(text){
						    var matches = text.match(/url\(\s*([^\) ]*)\s*\)/i);
						    if(!matches){
							    return;
						    }
						    
						    for(var i = 1; i < matches.length; i++){
							    handleUrl(matches[i])
						    }
					    }
				    });
			    }else if(sheet.cssText){ // IE
				    var matches;
				    var text = sheet.cssText.toString();
				    // unfortunately, using RegExp.exec seems to be flakey
				    // for looping across multiple lines on IE using the
				    // global flag, so we have to simulate it
				    var lines = text.split(/\f|\r|\n/);
				    for(var i = 0; i < lines.length; i++){
					    matches = lines[i].match(/url\(\s*([^\) ]*)\s*\)/i);
					    if(matches && matches.length){
						    handleUrl(matches[1]);
					    }
				    }
			    }
		    }catch(exp){
			    //console.debug("dojox.off.files.slurp stylesheet parse error: " 
			    //				+ exp.message||exp);
		    }
	    });
	    
	    //this.printURLs();
    },
    
    _sameLocation: function(url){
	    if(!url){ return false; }
	    
	    // filter out anchors
	    if(url.length && url.charAt(0) == "#"){
		    return false;
	    }
	    
	    // FIXME: dojo._Url should be made public;
	    // it's functionality is very useful for
	    // parsing URLs correctly, which is hard to
	    // do right
	    url = new dojo._Url(url);
	    
	    // totally relative -- ../../someFile.html
	    if(!url.scheme && !url.port && !url.host){ 
		    return true;
	    }
	    
	    // scheme relative with port specified -- brad.com:8080
	    if(!url.scheme && url.host && url.port
			    && window.location.hostname == url.host
			    && window.location.port == url.port){
		    return true;
	    }
	    
	    // scheme relative with no-port specified -- brad.com
	    if(!url.scheme && url.host && !url.port
		    && window.location.hostname == url.host
		    && window.location.port == 80){
		    return true;
	    }
	    
	    // else we have everything
	    return  window.location.protocol == (url.scheme + ":")
			    && window.location.hostname == url.host
			    && (window.location.port == url.port || !window.location.port && !url.port);
    },
    
    _get_version_info: function(callback) {
	var oldVersion = dojox.storage.get("oldVersion", dojox.off.STORAGE_NAMESPACE);
	var newVersion = null;
	
		dojo.xhrGet({
				url: this.version_url + "?browserbust=" + new Date().getTime(),
				error: function(err){
					//console.warn("dojox.off.files._getVersionInfo, err=",err);
					dojox.storage.remove("oldVersion", dojox.off.STORAGE_NAMESPACE);
					dojox.storage.remove("justDebugged", dojox.off.STORAGE_NAMESPACE);
					callback(oldVersion, newVersion, justDebugged);
				},
				load: function(data){
					//console.warn("dojox.off.files._getVersionInfo, load=",data);
					
					// some servers incorrectly return 404's
					// as a real page
					if(data){
						newVersion = data;
					}
					
					callback(oldVersion, newVersion, justDebugged);
				}
		});
	}
}
});