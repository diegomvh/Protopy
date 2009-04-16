$L('logging.*');

var FirebugHandler = type('FirebugHandler', [logging.Handler], {
    functions: {},

    '__init__': function __init__() {

        //TODO: Validar si hay firebug instalado

        //Ok tengo firebug
        this.functions[logging.CRITICAL] = window.console.error;
        this.functions[logging.ERROR]= window.console.error;
        this.functions[logging.WARN]= window.console.warn;
        this.functions[logging.WARNING]= window.console.warn;
        this.functions[logging.INFO]= window.console.info;
        this.functions[logging.DEBUG]= window.console.debug;
    },

    emit: function(record) {
        if (logging.ERROR == record.levelno)
            window.console.trace();
        this.functions[record.levelno](this.format(record));
    }
});

$P({
    FirebugHandler: FirebugHandler
})