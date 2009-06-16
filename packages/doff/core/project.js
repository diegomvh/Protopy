require('sys');
require('event');
require('ajax');

var Project = type('Project', object, {
    is_online: false,
    NET_CHECK: 5,
    availability_url: null,
    going_online: false,
    do_net_checking: true,
    target_element: document.createElement('div'),

    onLoad: function() {
	//Add the target element to html
	var body = $$('body')[0];
	body.insert(this.target_element);
    },

    onNetwork: function(type) {
	this.status_element.update(type);
    },

    handle: function(value) {
        return this.handler.handle(value);
    },

    __init__: function(package, offline_support) {
	this.package = package;
	//Registro la ruta absoluta al soporte offline
	sys.register_path(offline_support, '/' + offline_support);
        //Registro la ruta absoluta al proyecto
        sys.register_path(this.package, sys.module_url(offline_support, '/project'));
	this.path = sys.paths[this.package];
	
        //Url para ver si estoy conectado
        this.availability_url = sys.module_url(offline_support, '/network_check');

	//Inicio del handler para las url
	require('doff.core.urlhandler', 'Handler');
	this.handler = new Handler(this.settings.ROOT_URLCONF, this.target_element);

	//Inicio de los stores
	require('gears.localserver', 'ManagedResourceStore');
	this.project = new ManagedResourceStore(package + '_project');
	this.project.manifest_url = sys.module_url(offline_support, '/manifests/project.json');
	this.system = new ManagedResourceStore(package + '_system');
	this.system.manifest_url = sys.module_url(offline_support, '/manifests/system.json');
	
	//Inicio el logging
	require('logging.config', 'file_config');
        file_config(sys.module_url(this.package, 'logging.js'));

	this._create_toolbar();
    },

    _create_toolbar: function(){
	//The toolbar
	require('doff.utils.toolbar', 'ToolBar');
        
	this.toolbar = new ToolBar();
	this.status_element = this.toolbar.add('Offline');
        if (this.settings['DEBUG']) {
	    require('doff.utils.dbquery', 'DataBaseQuery');
            require('doff.utils.logger', 'Logger');
	    var dbquery = new DataBaseQuery();
            var logger = new Logger();
            this.toolbar.add(dbquery);
            this.toolbar.add(logger);
	}	
        this.toolbar.add('Settings');
        this.toolbar.add('Help');
    },

    bootstrap: function(){
	var self = this;
	event.connect(window, 'load', function(){
	    self.onLoad();
	    self.handle('/');
	    self.toolbar.show();
	});
    },

    sync_stores: function() {
        this.system.check_for_update();
        this.project.check_for_update();
    },

    get settings() {
	if (this._settings)
	    return this._settings;
	var self = this;
	var global_settings = require('doff.conf.settings');
	var url_settings = sys.module_url(this.package, 'settings.js');
	new ajax.Request(url_settings, {
            method: 'GET',
	    asynchronous : false,
	    onSuccess: function(transport) {
		var code = '(' + transport.responseText + ');';
		var project_settings = eval(code);
		self._settings = extend(global_settings, project_settings);
	    },
	    onException: function(obj, exception) {
		throw exception;
	    },
	    onFailure: function(transport) {
		throw new Exception("No settings");
	    }
	});
	return this._settings;
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
	    onSuccess: function(transport) {
		if(!self.is_online){
		    self.is_online = true;
		    self.onNetwork("online");
		}
	    },
	    onFailure: function(transport){
		if(self.is_online){
		    self.is_online = false;
		    //self.sync.is_syncing = false;
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
	// bust the browser's cache to make sure we are really talking to the server
	url += (url.indexOf("?") == -1)? "?" : "&";
	url += "browserbust=" + new Date().getTime();
	return url;
    }
});

/**
 * Instancia del proyecto
*/
var project = null;

function get_project(package, offline_support){
    if (!package && !project) 
	throw new Exception('No project');
    if (!project) 
	project = new Project(package, offline_support);
    return project;
}

function get_settings() {
    return get_project().settings;
}

/* Ideas que tengo que agregar

if (!google.gears.factory.hasPermission) {
    var siteName = 'My Site';
    var icon = 'images/myIcon.png';
    var msg = 'This site would like to use Google Gears to enable fast, '
            + 'as-you-type searching of its documents.';
    
    var allowed = google.gears.factory.getPermission(siteName, icon, msg);
}

--Detectar si esta gears y mostrar el link para instalacion
!sys.browser.features.Gears
var message = 'To enable fast client-side search of this website '
            + 'please install Gears';
var url = 'http://gears.google.com/?action=install'
            + '&message=' + encodeURIComponent(message)
            + '&return=' + encodeURIComponent(window.location.href);
widget.innerHTML = '<a href="' + url + '">Install '
                + 'Gears to enable fast search!</a>';
return false;


*/
publish({
    get_project: get_project,
    new_project: get_project,
    get_settings: get_settings
});