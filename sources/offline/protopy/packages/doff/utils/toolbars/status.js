require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');
require('sys');
require('doff.conf.settings', 'settings');

var Status = type('Status', [ Panel ], {
    __init__: function(project) {
        this.project = project;
        super(Panel, this).__init__('status', 'Install', 'Install offline access for ' + settings.PROJECT_NAME);
        this.width = '60%';
        
        if (this.project.is_installed) {
        	this.project.is_online ? this.go_online() : this.go_offline();
        	this.hgon = event.subscribe('go_online', getattr(this, 'go_online'));
        	this.hgoff = event.subscribe('go_offline', getattr(this, 'go_offline'));
        } else {
        	this.icon = sys.module_url('doff.utils.toolbars', 'templates/icons/protopy.png');
        }
    },

    go_online: function(status) {
        this.tab.update('Online');
        this.icon = sys.module_url('doff.utils.toolbars', 'templates/icons/online.png');
    },
    
    go_offline: function(status) {
        this.tab.update('Offline');
        this.icon = sys.module_url('doff.utils.toolbars', 'templates/icons/offline.png');
    },

    go_install: function(key, details) {
    	if (key === 'progress') {
    		// Store actualizando archivos
    		this.bar.setStyle({ 'width': (details.filesComplete * 100) / details.filesTotal+ '%' });
    	} else if (key === 'complete') {
    		// Now is installed
            this.go_online();
            this.hgon = event.subscribe('go_online', getattr(this, 'go_online'));
        	this.hgoff = event.subscribe('go_offline', getattr(this, 'go_offline'));
    		this.reload();
    	} else if (key === 'error') {
    		// Un error, quiza sea bueno dejarlo en un lugar de errores
    		this.status.insert('<p style="color:red;">' + details['message'] + '</p>');
    	} else {
    		this.status.insert('<p>' + details['message'] + '</p>');
    	}
    },
    
    install: function(e) {
    	$('status-progress-container').show();
        this.status = $('status-messages');
        this.status.update('');
        this.bar = $('status-progress-bar');
        this.project.install(getattr(this, 'go_install'));
    },

    go_uninstall: function(key, details) {},
    
    uninstall: function(e) {
    	this.project.uninstall(getattr(this, 'go_uninstall'));
    	event.unsubscribe(this.hgon);
    	event.unsubscribe(this.hgoff);
    	if (this.project.is_online) 
    		this.reload(); 
    	else 
    		window.location = '/';
    },
    
    get_template: function() {
    	var file = sys.module_url('doff.utils.toolbars', (this.project.is_installed) ? 'templates/status-installed.html' : 'templates/status-uninstalled.html');
        var template = '';
        new ajax.Request(file, {
            method: 'GET',
		    asynchronous : false,
		    onSuccess: function(transport) {
				template = transport.responseText;
		    },
		    onException: function(obj, exception) {
		    	throw exception;
		    },
		    onFailure: function(transport) {
		    	throw new Exception("No template for logger");
		    }
		});
        return new Template(template).evaluate(settings);
    },

    _display: function() {
        super(Panel, this)._display();

        if (this.project.is_installed) {
            event.connect($('status-reset'), 'click', this, 'uninstall');
            event.connect($('status-desktop'), 'click', this.project, 'create_shortcut');
        } else {
            event.connect($('status-enable'), 'click', this, 'install');
        }
    }
});

publish({
    Status: Status
});