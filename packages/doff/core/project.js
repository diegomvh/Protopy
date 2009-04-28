require('sys');
require('event');
require('ajax');
require('doff.core.urlhandler', 'Handler');
require('logging.config', 'file_config');
require('gears.localserver', 'ManagedResourceStore');

var Project = type('Project', [object], {
    settings: null,
    is_online: false,
    NET_CHECK: 5,
    availability_url: null,
    going_online: false,
    do_net_checking: true,
    handler: null,
    system: null,
    project: null,

    onLoad: function onLoad() {
        //this.sync_stores();
    },

    onNetwork: function(type) {},

    '__init__': function __init__(name, package, path){
	this.name = name;
	this.package = package;
	this.path = path;
	sys.register_module_path(this.package, this.path);
	this.availability_url = sys.module_url(this.package, 'network_check.txt');
	this.read_settings();
        this.handler = new Handler(this.settings.ROOT_URLCONF);
	// ManagedStores
	this.project = new ManagedResourceStore(package + '_project');
	this.project.manifest_url = sys.module_url(this.package, 'manifests/project.json');
        this.system = new ManagedResourceStore(package + '_system');
	this.system.manifest_url = sys.module_url(this.package, 'manifests/system.json');
        //Inicio el logging
        file_config(sys.module_url(this.package, 'logging.js'));
    },

    //FIXME: Mejorar esto un poco tengo un __init__ y un initialize es como medio cualquiera
    initialize: function initialize(){
	var self = this;
	event.connect(window, 'load', function(){
	    self.onLoad();
	    self.handler.handle('/');
	});
    },

    sync_stores: function sync_stores() {
        this.system.check_for_update();
        this.project.check_for_update();
    },

    read_settings: function read_settings() {
	var self = this;
	var global_settings = require('doff.conf.settings');
	var url_settings = sys.module_url(this.package, 'settings.js');
	new ajax.Request(url_settings, {
            method: 'GET',
	    asynchronous : false,
	    'onSuccess': function onSuccess(transport) {
		var code = '(' + transport.responseText + ');';
		var project_settings = eval(code);
		self.settings = extend(global_settings, project_settings);
	    },
	    'onException': function onException(obj, exception){
		throw exception;
	    },
	    'onFailure': function onFailure(transport){
		throw new Exception("No settings");
	    }
	});
    },

    go_offline: function(){ 
	if((this.sync.is_syncing)||(this.going_online)){ 
	    return; 
	}
	this.going_online = false;
	this.is_online = false;
    },
	
    go_online: function(callback){
	if(this.sync.is_syncing || this.going_online){
	    return;
	}
	this.going_online = true;
	this.is_online = false;
	
	// see if can reach our web application's web site
	this._is_site_available(callback);
    },
	
    network_check: function network_check(){
	var self = this;
	var get = new ajax.Request(this._get_availability_url(), {
	    method: 'GET',
	    asynchronous : false,
	    'onSuccess': function onSuccess(transport) {
		if(!self.is_online){
		    self.is_online = true;
		    self.onNetwork("online");
		}
	    },
	    'onFailure': function onFailure(transport){
		if(self.is_online){
		    self.is_online = false;
		    self.sync.is_syncing = false;
		    self.onNetwork("offline");
		}
	    }
	});
    },

    _start_network_thread: function(){
	if(!this.do_net_checking){
	    return;
	}
	
	this.thread = window.setInterval(getattr(this, 'network_check'), this.NET_CHECK * 1000);
    },

    _stop_network_thread: function(){
	if (this.thread != null) {
	    window.clearInterval(this.thread);
	    this.thread = null;
	}
    },

    _get_availability_url: function(){
	var url = this.availability_url;
	
	// bust the browser's cache to make sure we are really talking to
	// the server
	if(url.indexOf("?") == -1){
		url += "?";
	}else{
		url += "&";
	}
	url += "browserbust=" + new Date().getTime();
	
	return url;
    }
});

/**
 * Instancia del proyecto
*/
var project = null;

function get_project(name, package, path){
    if (!name && !project) throw new Exception('No project');
    if (!project) project = new Project(name, package, path);
    return project;
}

function get_settings() {
    return get_project().settings;
}

publish({
    get_project: get_project,
    get_settings: get_settings
});