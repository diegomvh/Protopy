require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');

//http://www.comesfa.org/es/node/14805

var Logger = type('Logger', Panel, {
    __init__: function() {
        super(Panel, this).__init__('logger', 'Logger');
    },

    get_template: function() {
        var file = sys.module_url('doff.utils', 'resources/logger.html');
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
        return template;
    },

    pause: function() {},

    _display: function() {
        this.render(this.get_template());
        var self = this;

        this.bt_pause = $('logger-pause');
        event.connect(this.bt_execute, 'click', this, 'pause');

	this.bt_clear = $('logger-clear');
	event.connect(this.bt_clear, 'click', function(event) {
	    self.output.update('');
	});
	this.output = $('logger-output');
    }
});

publish({
    Logger: Logger
});