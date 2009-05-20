require('doff.utils.toolbar', 'Panel');
require('logging.base', 'get_logger', 'get_level', 'Handler');
require('ajax');
require('event');

//http://www.comesfa.org/es/node/14805

var Logger = type('Logger', [Panel, Handler], {
    __init__: function() {
        super(Panel, this).__init__('logger', 'Logger');
        this.root = get_logger();
        this.root.add_handler(this);
        this.set_level(this.root.level);
        this.set_formatter('<p><span class=%(levelname)s>%(levelname)s</span> %(name)s - %(time)s:<br/>%(message)s</p>');
        this.paused = false;
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

    pause: function() {
        this.paused = !this.paused;
        this.bt_pause.style.backgroundColor = this.paused ? '#CCCCCC' : '#EEEEEE';
    },

    emit: function(record) {
        if (!isundefined(this.output) && !this.paused)
            this.output.insert(this.format(record));
    },

    _display: function() {
        super(Panel, this)._display();
        var self = this;

        this.bt_pause = $('logger-pause');
        event.connect(this.bt_pause, 'click', this, 'pause');

	this.bt_clear = $('logger-clear');
	event.connect(this.bt_clear, 'click', function(event) {
	    self.output.update('');
	});

        $$('input[type="radio"]').forEach(function(radio) { 
            radio.checked = get_level(self.level) === radio.value;
            event.connect(radio, 'click', function(e) {
                self.set_level(get_level(e.target.value));
                self.root.set_level(get_level(e.target.value));
            });
        });
	this.output = $('logger-output');
    }
});

publish({
    Logger: Logger
});