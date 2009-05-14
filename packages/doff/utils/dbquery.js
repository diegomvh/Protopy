require('doff.utils.toolbar', 'Panel');
require('ajax');

var DataBaseQuery = type('DataBaseQuery', Panel, {
    __init__: function() {
        super(Panel, this).__init__();
    },

    get_template: function() {
        var file = sys.module_url('doff.utils', 'resources/dbquery.html');
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
		throw new Exception("No template for dbquery");
	    }
	});
        return template;
    },

    _display: function() {
        this.div.update(this.get_template());
    },
});

publish({
    DataBaseQuery: DataBaseQuery
});