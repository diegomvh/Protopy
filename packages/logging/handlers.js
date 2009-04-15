var FirebugHandler = type('FirebugHandler', [Handler], {
    /*
    Base class for handlers that rotate log files at a certain point.
    Not meant to be instantiated directly.  Instead, use RotatingFileHandler
    or TimedRotatingFileHandler.
    */
    emit: function(record) {
	    console.log(record);
    }
});