require('datetime', 'datetime');

var CRITICAL = 50;
var FATAL = CRITICAL;
var ERROR = 40;
var WARNING = 30;
var WARN = WARNING;
var INFO = 20;
var DEBUG = 10;
var NOTSET = 0;

var _start_time = new Date();
var raise_exceptions = false;

var _levels = {};

_levels['CRITICAL']= CRITICAL;
_levels['ERROR']= ERROR;
_levels['WARN']= WARNING;
_levels['WARNING']= WARNING;
_levels['INFO']= INFO;
_levels['DEBUG']= DEBUG;
_levels['NOTSET']= NOTSET;
_levels[CRITICAL]= 'CRITICAL';
_levels[ERROR]= 'ERROR';
_levels[WARN]= 'WARNING';
_levels[WARNING]= 'WARNING';
_levels[INFO]= 'INFO';
_levels[DEBUG]= 'DEBUG';
_levels[NOTSET]= 'NOTSET';

function get_level(level) {
    return _levels[level] || "Level %s".subs(level);
}

function add_level_name(level, levelname) {
    _level_names[level] = levelname;
    _level_names[levelname] = level;
}

//-------------------------------------------------------------------------
//   The logging record
//-------------------------------------------------------------------------

/*
A LogRecord instance represents an event being logged.
LogRecord instances are created every time something is logged. They
contain all the information pertinent to the event being logged. The
main information passed in is in msg and args, which are combined
using str(msg) % args to create the message field of the record. The
record also includes information such as when the record was created,
the source line where the logging call was made, and any exception
information to be logged.
*/
var LogRecord = type('LogRecord', object, {
    //Initialize a logging record with interesting information.
    __init__: function __init__(name, level, pathname, lineno, msg, args, kwargs) {
        var ct = new Date();
        this.name = name;
        this.msg = msg;
	/*
        if args && (len(args) == 1) and args[0] and (type(args[0]) == types.DictType):
            args = args[0]
        */
	this.args = args;
        this.levelname = get_level(level);
        this.levelno = level;
        this.pathname = pathname;
        this.filename = kwargs.filename;
        this.module = kwargs.module;
        this.lineno = lineno;
        this.created = datetime.datetime(ct);
        this.relative_created = datetime.datetime((this.created - _start_time));
    },

    __str__: function __str__() {
        return '<LogRecord: %s, %s, %s, %s, "%s">'.subs(this.name, this.levelno, this.pathname, this.lineno, this.msg);
    },

    /*
    Return the message for this LogRecord.
    Return the message for this LogRecord after merging any user-supplied arguments with the message.
    */
    get message() {
        var msg = this.msg;
	if (type(msg) != String)
	    msg = str(this.msg);
        if (this.args)
            msg = msg.subs(this.args);
        return msg;
    },

    get time() {
	return datetime.format(this.created, 'yyyy-mm-dd hh:nn:ss');
    }
});

var _default_formatter = "%(levelname)s:%(name)s:%(message)s";

//---------------------------------------------------------------------------
//   Filter classes and functions
//---------------------------------------------------------------------------

var Filter = type('Filter', object, {
    /*
    Filter instances are used to perform arbitrary filtering of LogRecords.

    Loggers and Handlers can optionally use Filter instances to filter
    records as desired. The base filter class only allows events which are
    below a certain point in the logger hierarchy. For example, a filter
    initialized with "A.B" will allow events logged by loggers "A.B",
    "A.B.C", "A.B.C.D", "A.B.D" etc. but not "A.BB", "B.A.B" etc. If
    initialized with the empty string, all events are passed.
    */
    __init__: function __init__(name) {
        /*
        Initialize a filter.

        Initialize with the name of the logger which, together with its
        children, will have its events allowed through the filter. If no
        name is specified, allow every event.
        */
        this.name = name;
        this.nlen = len(name);
    },

    filter: function filter(record) {
        /*
        Determine if the specified record is to be logged.

        Is the specified record to be logged? Returns 0 for no, nonzero for
        yes. If deemed appropriate, the record may be modified in-place.
        */
        if (this.nlen == 0)
            return 1;
        else if (this.name == record.name)
            return 1;
        else if (record.name.slice(0, this.nlen).search(this.name) != 0)
            return 0;
        return (record.name[this.nlen] == ".");
    }
});

//A base class for loggers and handlers which allows them to share common code.
var Filterer = type('Filterer', object, {
    __init__: function __init__() {
        //Initialize the list of filters to be an empty list.
        this.filters = [];
    },

    add_filter: function add_filter(filter) {
        //Add the specified filter to this handler.
        if (!include(this.filters, filter))
            this.filters.push(filter);
    },

    remove_filter: function remove_filter(filter) {
        //Remove the specified filter from this handler.
        var index = this.filters.indexOf(filter);
	if (index != -1)
            delete this.filters[index];
    },

    filter: function filter(record) {
        /*
        Determine if a record is loggable by consulting all the filters.

        The default is to allow the record to be logged; any filter can veto
        this and the record is then dropped. Returns a zero value if a record
        is to be dropped, else non-zero.
        */
        for each (var f in this.filters)
            if (!f.filter(record))
                return false;
        return true;
    }
});

//---------------------------------------------------------------------------
//   Handler classes and functions
//---------------------------------------------------------------------------

var _handlers = {};  //repository of handlers (for flushing when shutdown called)
var _handler_list = []; //added to allow handlers to be removed in reverse of order initialized

var Handler = type('Handler', [ Filterer ], {
    level: NOTSET,
    formatter: null,
    /*
    Handler instances dispatch logging events to specific destinations.

    The base handler class. Acts as a placeholder which defines the Handler
    interface. Handlers can optionally use Formatter instances to format
    records as desired. By default, no formatter is specified; in this case,
    the 'raw' message as determined by record.message is logged.
    */
    __init__: function(level) {
        /*
        Initializes the instance - basically setting the formatter to None
        and the filter list to empty.
        */
	super(Filterer, this).__init__();
        this.level = level;
    },

    set_level: function (level) {
        this.level = level;
    },

    set_formatter: function (formatter) {
        this.formatter = formatter;
    },

    format: function(record) {
        /*Format the specified record.
        If a formatter is set, use it. Otherwise, use the default formatter
        for the module.
        */
        if (this.formatter)
            var fmt = this.formatter;
        else
            var fmt = _default_formatter;
        return fmt.subs(record);
    },
    
    emit: function(record) {
        /*
        Do whatever it takes to actually log the specified logging record.

        This version is intended to be implemented by subclasses and so
        raises a NotImplementedError.
        */
        throw new NotImplementedError('emit must be implemented by Handler subclasses');
    },

    handle: function handle(record) {
        /*
        Conditionally emit the specified logging record.

        Emission depends on filters which may have been added to the handler.
        Wrap the actual emission of the record with acquisition/release of
        the I/O thread lock. Returns whether the filter passed the record for
        emission.
        */
        var rv = this.filter(record);
        if (rv)
            this.emit(record);
        return rv;
    }
});

//---------------------------------------------------------------------------
//   Manager classes and functions
//---------------------------------------------------------------------------

var Manager = type('Manager', object, {
    /*
    There is [under normal circumstances] just one Manager instance, which
    holds the hierarchy of loggers.
    */
    __init__: function __init__(rootnode) {
        /*
        Initialize the manager with the root node of the logger hierarchy.
        */
        this.root = rootnode;
        this.disable = 0;
        this.emittedNoHandlerWarning = 0;
        this.logger_dict = {};
    },

    get_logger: function get_logger(name) {
        /*
        Get a logger with the specified name (channel name), creating it
        if it doesn't yet exist. This name is a dot-separated hierarchical
        name, such as "a", "a.b", "a.b.c" or similar.

        If a PlaceHolder existed for the specified name [i.e. the logger
        didn't exist but a child of it did], replace it with the created
        logger and fix up the parent/child references which pointed to the
        placeholder to now point to the logger.
        */
        var rv = null;
        if (this.logger_dict[name]) {
	    rv = this.logger_dict[name];
	    if (!isinstance(rv, Logger)) {
		var ph = rv;
		rv = new Logger(name);
		rv.manager = this;
		this.logger_dict[name] = rv;
		this._fixup_children(ph, rv);
		this._fixup_parents(rv);
	    }
        } else {
	    rv = new Logger(name);
	    rv.manager = this;
	    this.logger_dict[name] = rv;
	    this._fixup_parents(rv);
        }
        return rv;
    },

    _fixup_parents: function _fixup_parents(alogger) {
        /*
        Ensure that there are either loggers or placeholders all the way
        from the specified logger to the root of the logger hierarchy.
        */
        var name = alogger.name;
        var i = name.lastIndexOf('.');
        var rv = null;
        while ((i > 0) && !rv) {
            var substr = name.slice(0, i);
            if (!this.logger_dict[substr]) {
                this.logger_dict[substr] = {'loggers': [alogger]};
            } else {
                var obj = this.logger_dict[substr];
                if (isinstance(obj, Logger))
                    rv = obj;
                else
		    obj['loggers'].push(alogger);
	    }
            i = substr.lastIndexOf(".");
        }
	if (!rv)
            rv = this.root;
        alogger.parent = rv;
    },

    _fixup_children: function(ph, alogger) {
        /*
        Ensure that children of the placeholder ph are connected to the
        specified logger.
        */
        var name = alogger.name;
        var namelen = len(name);
        for each (var c in ph.loggers) {
            if (c.parent.name.slice(0, namelen) != name) {
                alogger.parent = c.parent;
                c.parent = alogger;
	    }
	}
    }
});

//---------------------------------------------------------------------------
//   Logger classes and functions
//--------------------------------------------------------------------------
/*
Instances of the Logger class represent a single logging channel. A
"logging channel" indicates an area of an application. Exactly how an
"area" is defined is up to the application developer. Since an
application can have any number of areas, logging channels are identified
by a unique string. Application areas can be nested (e.g. an area
of "input processing" might include sub-areas "read CSV files", "read
XLS files" and "read Gnumeric files"). To cater for this natural nesting,
channel names are organized into a namespace hierarchy where levels are
separated by periods, much like the Java or Python package namespace. So
in the instance given above, channel names might be "input" for the upper
level, and "input.csv", "input.xls" and "input.gnu" for the sub-levels.
There is no arbitrary limit to the depth of nesting.
*/
var Logger = type('Logger', [ Filterer ], {
    level: NOTSET,
    __init__: function __init__(name, level) {
        //Initialize the logger with a name and an optional level.
        super(Filterer, this).__init__();
        this.name = name;
        this.level = level;
        this.parent = null;
        this.propagate = true;
        this.handlers = [];
        this.disabled = 0;
    },

    set_level: function set_level(level) {
        //Set the logging level of this logger.
        this.level = level;
    },

    debug: function debug(msg) {
        /*
        Log 'msg % args' with severity 'DEBUG'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.debug("Houston, we have a %s", "thorny problem", exc_info=1)
        */
	arguments = new Arguments(arguments);
        if (this.manager.disable >= DEBUG)
            return;
        if (DEBUG >= this.get_effective_level())
            this._log(DEBUG, msg, arguments.args, arguments.kwargs);
    },

    info: function info(msg) {
        /*
        Log 'msg % args' with severity 'INFO'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.info("Houston, we have a %s", "interesting problem", exc_info=1)
        */
        arguments = new Arguments(arguments);
        if (this.manager.disable >= INFO)
            return;
        if (INFO >= this.get_effective_level())
	    this._log(INFO, msg, arguments.args, arguments.kwargs);
    },

    warning: function warning(msg) {
        /*
        Log 'msg % args' with severity 'WARNING'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.warning("Houston, we have a %s", "bit of a problem", exc_info=1)
        */
        arguments = new Arguments(arguments);
        if (this.manager.disable >= WARNING)
            return;
        if (this.is_enabled_for(WARNING))
	    this._log(WARNING, msg, arguments.args, arguments.kwargs);
    },

    warn: function warn(msg) { return this.warning(msg);},

    error: function error(msg) {
        /*
        Log 'msg % args' with severity 'ERROR'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.error("Houston, we have a %s", "major problem", exc_info=1)
        */
        arguments = new Arguments(arguments);
        if (this.manager.disable >= ERROR)
            return;
        if (this.is_enabled_for(ERROR))
            this._log(ERROR, msg, arguments.args, arguments.kwargs);
    },

    exception: function exception(msg) {
        //Convenience method for logging an ERROR with exception information.
        arguments = new Arguments(arguments);
        this.error(msg, arguments.args, arguments.kwargs);
    },

    critical: function critical(msg) {
        /*
        Log 'msg % args' with severity 'CRITICAL'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.critical("Houston, we have a %s", "major disaster", exc_info=1)
        */
        arguments = new Arguments(arguments);
        if (this.manager.disable >= CRITICAL)
            return;
        if (CRITICAL >= this.get_effective_level())
            this._log(CRITICAL, msg, arguments.args, arguments.kwargs);
    },

    fatal: function fatal(msg) { return this.critical(msg);},

    log: function log(level, msg) {
        /*
        Log 'msg % args' with the integer severity 'level'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.log(level, "We have a %s", "mysterious problem", exc_info=1)
        */
        arguments = new Arguments(arguments);
        if (type(level) != Number) {
            if (raise_exceptions)
                throw new TypeError("level must be an integer");
            else
                return;
	}
        if (this.manager.disable >= level)
            return;
        if (this.is_enabled_for(level))
            this._log(level, msg, arguments.args, arguments.kwargs);
    },

    _log: function _log(level, msg, args, kwargs) {
        /*
        Low-level logging routine which creates a LogRecord and then calls
        all the handlers of this logger to handle the record.
        
        if _srcfile:
            fn, lno, func = self.findCaller()
        else:
	*/
	//TODO: Agregar a sys un poco de informacion sobre la ejecucion
        var [fn, lno, func] = ["(unknown file)", 0, "(unknown function)"];
        var record = new LogRecord(this.name, level, fn, lno, msg, args, kwargs);
        this.handle(record);
    },

    handle: function handle(record) {
        /*
        Call the handlers for the specified record.

        This method is used for unpickled records received from a socket, as
        well as those created locally. Logger-level filtering is applied.
        */
        if ((!this.disabled) && this.filter(record))
            this.call_handlers(record);
    },

    add_handler: function add_handler(hdlr) {
        /*
        Add the specified handler to this logger.
        */
        if (!include(this.handlers, hdlr))
            this.handlers.push(hdlr);
    },

    remove_handler: function remove_handler(hdlr) {
        /*
        Remove the specified handler from this logger.
        */
	var index = this.handlers.indexOf(hdlr);
        if (index >= 0)
            delete this.handlers[index];
    },

    clear_handlers: function clear_handlers() {
        /*
        Remove all the handlers from this logger.
        */
	this.handlers.length = 0;
    },

    call_handlers: function call_handlers(record) {
        /*
        Pass a record to all relevant handlers.
        Loop through all handlers for this logger and its parents in the
        logger hierarchy. If no handler was found, output a one-off error
        message to sys.stderr. Stop searching up the hierarchy whenever a
        logger with the "propagate" attribute set to zero is found - that
        will be the last logger whose handlers are called.
        */
        var c = this;
        var found = 0;
        while (c) {
            for each (var hdlr in c.handlers) {
                var found = found + 1
                if (record.levelno >= hdlr.level)
                    hdlr.handle(record);
	    }
            if (!c.propagate)
                c = null;
            else
                c = c.parent;
	}
        if ((found == 0) && raiseExceptions && !this.manager.emittedNoHandlerWarning) {
            alert("No handlers could be found for logger \"%s\"".subs(this.name));
            this.manager.emittedNoHandlerWarning = 1;
	}
    },

    get_effective_level: function get_effective_level() {
        /*
        Get the effective level for this logger.
        Loop through this logger and its parents in the logger hierarchy,
        looking for a non-zero logging level. Return the first one found.
        */
        var logger = this;
        while (logger) {
            if (logger.level)
                return logger.level;
            logger = logger.parent;
	}
        return NOTSET;
    },

    is_enabled_for: function is_enabled_for(level) {
        /*
        Is this logger enabled for level 'level'?
        */
        if (this.manager.disable >= level)
            return 0
        return level >= this.get_effective_level();
    }
});

/*
A root logger is not that different to any other logger, except that
it must have a logging level and there is only one instance of it in the hierarchy.
*/
var RootLogger = type('RootLogger', [ Logger ], {
    __init__: function __init__(level) {
        //Initialize the logger with the name "root".
        super(Logger, this).__init__("root", level);
    }
});

var root = new RootLogger(WARNING);
Logger.prototype.root = root;
root.manager = Logger.prototype.manager = new Manager(root);

/*
Return a logger with the specified name, creating it if necessary.
If no name is specified, return the root logger.
*/
function get_logger(name) {
    if (name)
        return root.manager.get_logger(name);
    else
        return root;
}

publish({
    //levels
    CRITICAL : CRITICAL,
    ERROR : ERROR,
    WARN : WARNING,
    WARNING : WARNING,
    INFO : INFO,
    DEBUG : DEBUG,
    NOTSET : NOTSET,
    //Functions
    get_level: get_level,
    get_logger: get_logger,
    //root looger
    root: root,
    //Classes
    Logger: Logger,
    Handler: Handler
});