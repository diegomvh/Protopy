require('doff.utils.toolbar', 'Panel');
require('logging.base', 'get_logger', 'get_level', 'Handler');
require('ajax');
require('event');

var Logger = type('Logger', [Panel, Handler], {
    __init__: function(project) {
        super(Panel, this).__init__('logger', 'Logger');
        this.root = get_logger();
        this.root.add_handler(this);
        this.set_level(this.root.level);
        this.set_formatter('<p><span class=%(levelname)s>%(levelname)s</span> %(name)s - %(time)s:<br/>%(message)s</p>');
        this.paused = false;
        this.icon = sys.module_url('doff.utils', 'resources/logger.png');
        this.height = '30em';
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
        print(record);
        if (!isundefined(this.output) && !this.paused && (this.name == 'root' || record.name == this.name))
            this.output.insert(this.format(record));
    },

    set_name: function(event){
        this.name = event.target.value;
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
        this.select_module = $('logger-filter-modulo');
        this.select_module.insert('<option value="root">root</option>');
        for each (var l in this.root.manager.loggers)
            this.select_module.insert('<option value="' + l.name + '">' + l.name + '</option>');
        event.connect(this.select_module, 'change', this, 'set_name');
        this.select_module.selectedIndex = 0;
        this.name = 'root';
        this.output = $('logger-output');
    }
});

publish({
    Logger: Logger
});