require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');

var Offline = type('Offline', [ Panel ], {
    __init__: function(status, config) {
	this.config = config;
        super(Panel, this).__init__('logger', 'Offline', 'Install offline access for ' + this.config['NAME']);
	this.height = '20em';
	this.width = '40%';
    },

    get_template: function() {
        var file = sys.module_url('doff.utils', 'resources/offline_install.html');
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
		throw new Exception("No template for offline panel");
	    }
	});
        return template;
    },

    _display: function() {
        super(Panel, this)._display();
        var self = this;

        $('offline-content').insert('<p>' + this.config['DESCRIPTION'] + '</p>');
        $('offline-content').insert('<img src="' + this.config['IMAGE'] + '" width="100"/>');
    }
});

publish({
    Offline: Offline
});