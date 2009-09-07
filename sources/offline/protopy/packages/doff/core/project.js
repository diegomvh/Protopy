require('sys');
require('event');
require('dom');
require('ajax');

var FakeHtml = type('FakeHtml', [ object ], {
    event_elements: {'FORM': 'onsubmit', 'A': 'onclick'},
    event_handlers: [],

    __init__: function(content) {
        this.head = document.createElement('div');
        this.head.id = "fake_head";
        this.body = document.createElement('div');
        this.body.id = "fake_body";
        // Apagando la chache del selector
        dom.cache(false);
        $$('body')[0].update(this.head);
        $$('body')[0].insert(this.body);
        this.update(content);
    },
    update: function(content) {
        this.remove_hooks();
        var head = content.match(new RegExp('<head[^>]*>([\\S\\s]*?)<\/head>', 'im'));
        if (head)
            this.head.update(head[1]);
        var body = content.match(new RegExp('<body[^>]*>([\\S\\s]*?)<\/body>', 'im'));
        if (body)
            this.body.update(body[1]);
        else this.body.update(content);
        this.add_hooks();
    },

    onEvent: function(event) {},

    add_hooks: function() {
        var self = this;
        var re = keys(this.event_elements).reduce(
            function(previous, current) { return previous.concat(self.body.select(current)); }, []);
            re.forEach(function(e) {
                self.event_handlers.push(event.connect(e, self.event_elements[e.tagName], getattr(self, 'onEvent')));
            });
    },

    remove_hooks: function() {
        this.event_handlers.forEach(function(hler) {
            event.disconnect(hler);
        });
    },
});

var Project = type('Project', object, {
    is_online: true,
    NET_CHECK: 5,
    availability_url: null,
    jsonrpc_url: null,
    do_net_checking: true,

    onLoad: function() {
        // Creo el objeto html
        this.html = new FakeHtml($$('html')[0].innerHTML);
        // Inicio del handler para las url
        require('doff.core.urlhandler', 'Handler');
        this.handler = new Handler(this.settings.ROOT_URLCONF, this.html);

        event.connect(this.html, 'onEvent', this.handler, 'handle');

        // Inicio el logging, si no hay hay archivo de configuracion no pasa nada
        require('logging.config', 'file_config');
        try {
            file_config(sys.module_url(this.package, 'logging.js'));
        } catch (except) {}

        // this._create_toolbar();
        // this.network_check();
        // this._start_network_thread();
        // this.go_offline();
        // this.handler.handle('/');
    },

    onNetwork: function(type) {
        var m = 'go_' + type;
        this[m]();
    },

    __init__: function(package, offline_support) {
        this.package = package;
        this.offline_support = offline_support;
        this.start_url = location.pathname;

        // Registro la ruta al proyecto
        sys.register_path(this.package, this.offline_support + '/js');

        // Url para ver si estoy conectado
        this.availability_url = this.offline_support + '/network_check';

        // Url para jsonrpc
        this.jsonrpc_url = this.offline_support + '/jsonrpc';

        this.templates_url = this.offline_support + '/templates/';

        if (sys.gears.installed && sys.gears.hasPermission)
            this._create_stores();
    },

    _create_toolbar: function(){
        require('doff.utils.toolbar', 'ToolBar');

        this.toolbar = new ToolBar();
        // The status and installer bar
        require('doff.utils.toolbars.status', 'Status');
        this.toolbar.add(new Status(this));
        if (this.settings['DEBUG']) {
            require('doff.utils.toolbars.dbquery', 'DataBaseQuery');
            require('doff.utils.toolbars.logger', 'Logger');
            this.toolbar.add(new DataBaseQuery());
            this.toolbar.add(new Logger());
        }
        this.toolbar.add('Help');
        this.toolbar.show();
    },

    _create_stores: function() {
        var localserver = sys.gears.create('beta.localserver');
        this.managed_store = localserver.createManagedStore(this.package + '_manifest');
        this.managed_store.manifestUrl = this.offline_support + '/manifest.json?refered=' + this.start_url;
    },

    _create_jsonrpc: function() {
        require('rpc');
        this.jsonrpc = new rpc.ServiceProxy(this.jsonrpc_url, {asynchronous: false});
    },

    bootstrap: function(){
        event.connect(window, 'load', this, 'onLoad');
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

    go_offline: function() { 
        this.html.add_hooks();
    },

    go_online: function(callback) {
        this.html.remove_hooks();
    },

    get_permission: function() {
        if (sys.gears.hasPermission)
            return true;
        var site_name = this.settings.PROJECT_NAME;
        var icon = this.settings.PROJECT_IMAGE;
        var msg = this.settings.PROJECT_DESCRIPTION
            + 'This site would like to use Google Gears to enable fast, '
            + 'as-you-type searching of its documents.';

        return sys.gears.getPermission(site_name, icon, msg);
    },

    get is_installed() {
        // TODO: Un cache
        try {
            var localserver = sys.gears.create('beta.localserver');
            return localserver.canServeLocally('/');
        } catch (e) { return false; }
    },

    install: function() {
        if (!sys.gears.installed) sys.gears.install();
        if (!this.get_permission()) return;
        if (isundefined(this.managed_stores))
            this._create_stores();

        for each (var store in this.managed_stores)
            store.check_for_update();

        require('doff.db.utils','syncdb');
        syncdb();
    },

    uninstall: function() {
        require('doff.db.utils','removedb');
        removedb();

        for each (var store in this.managed_stores)
            store.delete();
    },

    /***************************************************************************
     * Network Check
     */
    network_check: function network_check(){
        var self = this;
        var get = new ajax.Request(this._get_availability_url(), {
            method: 'GET',
            onComplete: function(transport) {
                if (200 == transport.status) {
                    if(!self.is_online) {
                        self.is_online = true;
                        self.onNetwork("online");
                   }
                } else if(self.is_online) {
                    self.is_online = false;
                    self.onNetwork("offline");
                }
            }
        });
    },

    _start_network_thread: function(){
        if(!this.do_net_checking)
            return;
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
        // bust the browser's cache to make sure we are really talking to the
        // server
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

publish({
    get_project: get_project,
    new_project: get_project,
    get_settings: get_settings
});