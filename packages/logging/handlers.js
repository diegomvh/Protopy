$L('logging.*');

var FirebugHandler = type('FirebugHandler', [logging.Handler], {
    functions: {},

    '__init__': function __init__() {

        if (window.console) {
            //Ok tengo firebug
            this.functions[logging.CRITICAL] = window.console.error;
            this.functions[logging.ERROR]= window.console.error;
            this.functions[logging.WARN]= window.console.warn;
            this.functions[logging.WARNING]= window.console.warn;
            this.functions[logging.INFO]= window.console.info;
            this.functions[logging.DEBUG]= window.console.debug;
            this.trace = window.console.trace;
        } else {
            alert('Firebug is not installed, please install from: ')
            this.functions[logging.CRITICAL] = function(){};
            this.functions[logging.ERROR]= function(){};
            this.functions[logging.WARN]= function(){};
            this.functions[logging.WARNING]= function(){};
            this.functions[logging.INFO]= function(){};
            this.functions[logging.DEBUG]= function(){};
            this.trace = function(){};
        }
    },

    emit: function(record) {
        if (logging.ERROR == record.levelno)
            this.trace();
        this.functions[record.levelno](this.format(record));
    }
});

var AlertHandler = type('AlertHandler', [logging.Handler], {
    emit: function(record) {
        alert(this.format(record));
    }
});

$P({
    FirebugHandler: FirebugHandler,
    AlertHandler: AlertHandler
})