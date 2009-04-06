var CRITICAL = 50;
var FATAL = CRITICAL;
var ERROR = 40;
var WARNING = 30;
var WARN = WARNING;
var INFO = 20;
var DEBUG = 10;
var NOTSET = 0;

var _levelNames = {
    CRITICAL : 'CRITICAL',
    ERROR : 'ERROR',
    WARNING : 'WARNING',
    INFO : 'INFO',
    DEBUG : 'DEBUG',
    NOTSET : 'NOTSET',
    'CRITICAL' : CRITICAL,
    'ERROR' : ERROR,
    'WARN' : WARNING,
    'WARNING' : WARNING,
    'INFO' : INFO,
    'DEBUG' : DEBUG,
    'NOTSET' : NOTSET,
}

function get_level_name(level) {
    return _levelNames[level] || "Level %s".subs(level);
}

function add_level_name(level, levelname) {
    _levelNames[level] = levelname;
    _levelNames[levelname] = level;
}

//-------------------------------------------------------------------------
//   The logging record
//-------------------------------------------------------------------------

var LogRecord = type('LogRecord', {
    """
    A LogRecord instance represents an event being logged.

    LogRecord instances are created every time something is logged. They
    contain all the information pertinent to the event being logged. The
    main information passed in is in msg and args, which are combined
    using str(msg) % args to create the message field of the record. The
    record also includes information such as when the record was created,
    the source line where the logging call was made, and any exception
    information to be logged.
    """
    def __init__(self, name, level, pathname, lineno,
                 msg, args, exc_info, func=None):
        """
        Initialize a logging record with interesting information.
        """
        ct = time.time()
        self.name = name
        self.msg = msg
        #
        # The following statement allows passing of a dictionary as a sole
        # argument, so that you can do something like
        #  logging.debug("a %(a)d b %(b)s", {'a':1, 'b':2})
        # Suggested by Stefan Behnel.
        # Note that without the test for args[0], we get a problem because
        # during formatting, we test to see if the arg is present using
        # 'if self.args:'. If the event being logged is e.g. 'Value is %d'
        # and if the passed arg fails 'if self.args:' then no formatting
        # is done. For example, logger.warn('Value is %d', 0) would log
        # 'Value is %d' instead of 'Value is 0'.
        # For the use case of passing a dictionary, this should not be a
        # problem.
        if args and (len(args) == 1) and args[0] and (type(args[0]) == types.DictType):
            args = args[0]
        self.args = args
        self.levelname = getLevelName(level)
        self.levelno = level
        self.pathname = pathname
        try:
            self.filename = os.path.basename(pathname)
            self.module = os.path.splitext(self.filename)[0]
        except:
            self.filename = pathname
            self.module = "Unknown module"
        self.exc_info = exc_info
        self.exc_text = None      # used to cache the traceback text
        self.lineno = lineno
        self.funcName = func
        self.created = ct
        self.msecs = (ct - long(ct)) * 1000
        self.relativeCreated = (self.created - _startTime) * 1000
        if logThreads and thread:
            self.thread = thread.get_ident()
            self.threadName = threading.currentThread().getName()
        else:
            self.thread = None
            self.threadName = None
        if logProcesses and hasattr(os, 'getpid'):
            self.process = os.getpid()
        else:
            self.process = None

    def __str__(self):
        return '<LogRecord: %s, %s, %s, %s, "%s">'%(self.name, self.levelno,
            self.pathname, self.lineno, self.msg)

    def getMessage(self):
        """
        Return the message for this LogRecord.

        Return the message for this LogRecord after merging any user-supplied
        arguments with the message.
        """
        if not hasattr(types, "UnicodeType"): #if no unicode support...
            msg = str(self.msg)
        else:
            msg = self.msg
            if type(msg) not in (types.UnicodeType, types.StringType):
                try:
                    msg = str(self.msg)
                except UnicodeError:
                    msg = self.msg      #Defer encoding till later
        if self.args:
            msg = msg % self.args
        return msg
});

//---------------------------------------------------------------------------
//   Formatter classes and functions
//---------------------------------------------------------------------------

class Formatter:
    """
    Formatter instances are used to convert a LogRecord to text.

    Formatters need to know how a LogRecord is constructed. They are
    responsible for converting a LogRecord to (usually) a string which can
    be interpreted by either a human or an external system. The base Formatter
    allows a formatting string to be specified. If none is supplied, the
    default value of "%s(message)\\n" is used.

    The Formatter can be initialized with a format string which makes use of
    knowledge of the LogRecord attributes - e.g. the default value mentioned
    above makes use of the fact that the user's message and arguments are pre-
    formatted into a LogRecord's message attribute. Currently, the useful
    attributes in a LogRecord are described by:

    %(name)s            Name of the logger (logging channel)
    %(levelno)s         Numeric logging level for the message (DEBUG, INFO,
                        WARNING, ERROR, CRITICAL)
    %(levelname)s       Text logging level for the message ("DEBUG", "INFO",
                        "WARNING", "ERROR", "CRITICAL")
    %(pathname)s        Full pathname of the source file where the logging
                        call was issued (if available)
    %(filename)s        Filename portion of pathname
    %(module)s          Module (name portion of filename)
    %(lineno)d          Source line number where the logging call was issued
                        (if available)
    %(funcName)s        Function name
    %(created)f         Time when the LogRecord was created (time.time()
                        return value)
    %(asctime)s         Textual time when the LogRecord was created
    %(msecs)d           Millisecond portion of the creation time
    %(relativeCreated)d Time in milliseconds when the LogRecord was created,
                        relative to the time the logging module was loaded
                        (typically at application startup time)
    %(thread)d          Thread ID (if available)
    %(threadName)s      Thread name (if available)
    %(process)d         Process ID (if available)
    %(message)s         The result of record.getMessage(), computed just as
                        the record is emitted
    """

    converter = time.localtime

    def __init__(self, fmt=None, datefmt=None):
        """
        Initialize the formatter with specified format strings.

        Initialize the formatter either with the specified format string, or a
        default as described above. Allow for specialized date formatting with
        the optional datefmt argument (if omitted, you get the ISO8601 format).
        """
        if fmt:
            self._fmt = fmt
        else:
            self._fmt = "%(message)s"
        self.datefmt = datefmt

    def formatTime(self, record, datefmt=None):
        """
        Return the creation time of the specified LogRecord as formatted text.

        This method should be called from format() by a formatter which
        wants to make use of a formatted time. This method can be overridden
        in formatters to provide for any specific requirement, but the
        basic behaviour is as follows: if datefmt (a string) is specified,
        it is used with time.strftime() to format the creation time of the
        record. Otherwise, the ISO8601 format is used. The resulting
        string is returned. This function uses a user-configurable function
        to convert the creation time to a tuple. By default, time.localtime()
        is used; to change this for a particular formatter instance, set the
        'converter' attribute to a function with the same signature as
        time.localtime() or time.gmtime(). To change it for all formatters,
        for example if you want all logging times to be shown in GMT,
        set the 'converter' attribute in the Formatter class.
        """
        ct = self.converter(record.created)
        if datefmt:
            s = time.strftime(datefmt, ct)
        else:
            t = time.strftime("%Y-%m-%d %H:%M:%S", ct)
            s = "%s,%03d" % (t, record.msecs)
        return s

    def formatException(self, ei):
        """
        Format and return the specified exception information as a string.

        This default implementation just uses
        traceback.print_exception()
        """
        sio = cStringIO.StringIO()
        traceback.print_exception(ei[0], ei[1], ei[2], None, sio)
        s = sio.getvalue()
        sio.close()
        if s[-1:] == "\n":
            s = s[:-1]
        return s

    def format(self, record):
        """
        Format the specified record as text.

        The record's attribute dictionary is used as the operand to a
        string formatting operation which yields the returned string.
        Before formatting the dictionary, a couple of preparatory steps
        are carried out. The message attribute of the record is computed
        using LogRecord.getMessage(). If the formatting string contains
        "%(asctime)", formatTime() is called to format the event time.
        If there is exception information, it is formatted using
        formatException() and appended to the message.
        """
        record.message = record.getMessage()
        if string.find(self._fmt,"%(asctime)") >= 0:
            record.asctime = self.formatTime(record, self.datefmt)
        s = self._fmt % record.__dict__
        if record.exc_info:
            # Cache the traceback text to avoid converting it multiple times
            # (it's constant anyway)
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            if s[-1:] != "\n":
                s = s + "\n"
            s = s + record.exc_text
        return s

var _defaultFormatter = new Formatter();

//---------------------------------------------------------------------------
//   Filter classes and functions
//---------------------------------------------------------------------------

var Filter = type('Filter', {
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
        else if (record.name.slice(0, this.nlen).search(this.name) != 0):
            return 0;
        return (record.name[this.nlen] == ".");
    }
});

//A base class for loggers and handlers which allows them to share common code.
var Filterer = type('Filterer', {
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
var _handlerList = []; //added to allow handlers to be removed in reverse of order initialized

var Handler = type('Handler', [Filterer], 
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
	level= level || NOTSET;
        super(Filterer, this).__init__();
        this.level = level;
        this.formatter = null;

    def setLevel(self, level):
        """
        Set the logging level of this handler.
        """
        self.level = level

    def format(self, record):
        """
        Format the specified record.

        If a formatter is set, use it. Otherwise, use the default formatter
        for the module.
        """
        if self.formatter:
            fmt = self.formatter
        else:
            fmt = _defaultFormatter
        return fmt.format(record)

    def emit(self, record):
        """
        Do whatever it takes to actually log the specified logging record.

        This version is intended to be implemented by subclasses and so
        raises a NotImplementedError.
        """
        raise NotImplementedError, 'emit must be implemented '\
                                    'by Handler subclasses'

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

    def setFormatter(self, fmt):
        """
        Set the formatter for this handler.
        """
        self.formatter = fmt

    def flush(self):
        """
        Ensure all logging output has been flushed.

        This version does nothing and is intended to be implemented by
        subclasses.
        """
        pass

    def close(self):
        """
        Tidy up any resources used by the handler.

        This version does removes the handler from an internal list
        of handlers which is closed when shutdown() is called. Subclasses
        should ensure that this gets called from overridden close()
        methods.
        """
        #get the module data lock, as we're updating a shared structure.
        _acquireLock()
        try:    #unlikely to raise an exception, but you never know...
            del _handlers[self]
            _handlerList.remove(self)
        finally:
            _releaseLock()

    def handleError(self, record):
        """
        Handle errors which occur during an emit() call.

        This method should be called from handlers when an exception is
        encountered during an emit() call. If raiseExceptions is false,
        exceptions get silently ignored. This is what is mostly wanted
        for a logging system - most users will not care about errors in
        the logging system, they are more interested in application errors.
        You could, however, replace this with a custom handler if you wish.
        The record which was being processed is passed in to this method.
        """
        if raiseExceptions:
            ei = sys.exc_info()
            traceback.print_exception(ei[0], ei[1], ei[2], None, sys.stderr)
            del ei

var Manager = type('Manager', {
    /*
    There is [under normal circumstances] just one Manager instance, which
    holds the hierarchy of loggers.
    */
    __init__: function __init__(rootnode) {
        """
        Initialize the manager with the root node of the logger hierarchy.
        """
        self.root = rootnode
        self.disable = 0
        self.emittedNoHandlerWarning = 0
        self.loggerDict = {}
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
        } else {
                rv = new LoggerClass(name);
                rv.manager = this;
                this.logger_dict[name] = rv;
                this._fixupParents(rv);
        }
        return rv;
    },

    def _fixupParents(self, alogger):
        """
        Ensure that there are either loggers or placeholders all the way
        from the specified logger to the root of the logger hierarchy.
        """
        name = alogger.name
        i = string.rfind(name, ".")
        rv = None
        while (i > 0) and not rv:
            substr = name[:i]
            if not self.loggerDict.has_key(substr):
                self.loggerDict[substr] = PlaceHolder(alogger)
            else:
                obj = self.loggerDict[substr]
                if isinstance(obj, Logger):
                    rv = obj
                else:
                    assert isinstance(obj, PlaceHolder)
                    obj.append(alogger)
            i = string.rfind(name, ".", 0, i - 1)
        if not rv:
            rv = self.root
        alogger.parent = rv

    def _fixupChildren(self, ph, alogger):
        """
        Ensure that children of the placeholder ph are connected to the
        specified logger.
        """
        name = alogger.name
        namelen = len(name)
        for c in ph.loggerMap.keys():
            #The if means ... if not c.parent.name.startswith(nm)
            #if string.find(c.parent.name, nm) <> 0:
            if c.parent.name[:namelen] != name:
                alogger.parent = c.parent
                c.parent = alogger
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
    __init__: function __init__(name, level) {
        //Initialize the logger with a name and an optional level.
        level = lever || NOTSET;
        super(Filterer, this).__init__();
        this.name = name;
        this.level = level;
        this.parent = null;
        this.propagate = 1;
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
        var args = arguments.args;
        var kwargs = arguments.kwargs;
        if (this.manager.disable >= DEBUG)
            return;
        if (DEBUG >= this.get_effective_level())
            this._log(DEBUG, msg, args, kwargs.exc_info, kwargs.extra);
    },

    info: function info(msg) {
        /*
        Log 'msg % args' with severity 'INFO'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.info("Houston, we have a %s", "interesting problem", exc_info=1)
        */
        arguments = new Arguments(arguments);
        var args = arguments.args;
        var kwargs = arguments.kwargs;
	if (this.manager.disable >= INFO)
            return;
        if (INFO >= this.get_effective_level())
	    this._log(INFO, msg, args, kwargs.exc_info, kwargs.extra);
    },

    warning: function warning(msg) {
        /*
        Log 'msg % args' with severity 'WARNING'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.warning("Houston, we have a %s", "bit of a problem", exc_info=1)
        */
        arguments = new Arguments(arguments);
        var args = arguments.args;
        var kwargs = arguments.kwargs;
	if (this.manager.disable >= WARNING)
            return;
        if (this.is_enabled_for(WARNING))
	    this._log(WARNING, msg, args, kwargs.exc_info, kwargs.extra);
    },

    warn: this.warning,

    error: function error(msg) {
        /*
        Log 'msg % args' with severity 'ERROR'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.error("Houston, we have a %s", "major problem", exc_info=1)
        */
        arguments = new Arguments(arguments);
        var args = arguments.args;
        var kwargs = arguments.kwargs;
	if (this.manager.disable >= ERROR)
            return;
        if (this.is_enabled_for(ERROR))
            this._log(ERROR, msg, args, kwargs.exc_info, kwargs.extra);
    },

    exception: function exception(msg) {
        //Convenience method for logging an ERROR with exception information.
        arguments = new Arguments(arguments);
        var args = arguments.args;
        this.error(msg, args, {'exc_info': 1});
    },

    critical: function critical(msg) {
        /*
        Log 'msg % args' with severity 'CRITICAL'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.critical("Houston, we have a %s", "major disaster", exc_info=1)
        */
        arguments = new Arguments(arguments);
        var args = arguments.args;
        var kwargs = arguments.kwargs;
	if (this.manager.disable >= CRITICAL)
            return;
        if (CRITICAL >= this.get_effective_level())
            this._log(CRITICAL, msg, args, kwargs.exc_info, kwargs.extra);
    },

    fatal: this.critical,

    log: function log(level, msg) {
        /*
        Log 'msg % args' with the integer severity 'level'.

        To pass exception information, use the keyword argument exc_info with
        a true value, e.g.

        logger.log(level, "We have a %s", "mysterious problem", exc_info=1)
        */
        arguments = new Arguments(arguments);
        var args = arguments.args;
        var kwargs = arguments.kwargs;
	if (type(level) != Number)
            if (raise_exceptions)
                throw new TypeError("level must be an integer");
            else
                return;
        if (this.manager.disable >= level)
            return;
        if (this.is_enabled_for(level))
            this._log(level, msg, args, kwargs.exc_info, kwargs.extra);
    },

    _log: function _log(level, msg, args, exc_info, extra) {
        /*
        Low-level logging routine which creates a LogRecord and then calls
        all the handlers of this logger to handle the record.
        
        if _srcfile:
            fn, lno, func = self.findCaller()
        else:
	*/
	//TODO: Agregar a sys un poco de informacion sobre la ejecucion
        var [fn, lno, func] = ["(unknown file)", 0, "(unknown function)"];
        if (exc_info)
            if type(exc_info) != types.TupleType:
                exc_info = sys.exc_info()
        record = self.makeRecord(self.name, level, fn, lno, msg, args, exc_info, func, extra)
        self.handle(record)

    def handle(self, record):
        """
        Call the handlers for the specified record.

        This method is used for unpickled records received from a socket, as
        well as those created locally. Logger-level filtering is applied.
        """
        if (not self.disabled) and self.filter(record):
            self.callHandlers(record)

    def addHandler(self, hdlr):
        """
        Add the specified handler to this logger.
        """
        if not (hdlr in self.handlers):
            self.handlers.append(hdlr)

    def removeHandler(self, hdlr):
        """
        Remove the specified handler from this logger.
        """
        if hdlr in self.handlers:
            #hdlr.close()
            hdlr.acquire()
            try:
                self.handlers.remove(hdlr)
            finally:
                hdlr.release()

    def callHandlers(self, record):
        """
        Pass a record to all relevant handlers.

        Loop through all handlers for this logger and its parents in the
        logger hierarchy. If no handler was found, output a one-off error
        message to sys.stderr. Stop searching up the hierarchy whenever a
        logger with the "propagate" attribute set to zero is found - that
        will be the last logger whose handlers are called.
        """
        c = self
        found = 0
        while c:
            for hdlr in c.handlers:
                found = found + 1
                if record.levelno >= hdlr.level:
                    hdlr.handle(record)
            if not c.propagate:
                c = None    #break out
            else:
                c = c.parent
        if (found == 0) and raiseExceptions and not self.manager.emittedNoHandlerWarning:
            sys.stderr.write("No handlers could be found for logger"
                             " \"%s\"\n" % self.name)
            self.manager.emittedNoHandlerWarning = 1

    def getEffectiveLevel(self):
        """
        Get the effective level for this logger.

        Loop through this logger and its parents in the logger hierarchy,
        looking for a non-zero logging level. Return the first one found.
        """
        logger = self
        while logger:
            if logger.level:
                return logger.level
            logger = logger.parent
        return NOTSET

    def isEnabledFor(self, level):
        """
        Is this logger enabled for level 'level'?
        """
        if self.manager.disable >= level:
            return 0
        return level >= self.getEffectiveLevel()
});

/*
A root logger is not that different to any other logger, except that
it must have a logging level and there is only one instance of it in the hierarchy.
*/
var RootLogger = type('RootLogger', [Logger], {
    __init__: function __init__(level) {
        //Initialize the logger with the name "root".
        super(Logger, this).__init__("root", level);
    }
});

var LoggerClass = Logger;

var root = new RootLogger(WARNING);
Logger.root = root;
Logger.manager = new Manager(Logger.root);

#---------------------------------------------------------------------------
# Configuration classes and functions
#---------------------------------------------------------------------------

BASIC_FORMAT = "%(levelname)s:%(name)s:%(message)s"

def basicConfig(**kwargs):
    """
    Do basic configuration for the logging system.

    This function does nothing if the root logger already has handlers
    configured. It is a convenience method intended for use by simple scripts
    to do one-shot configuration of the logging package.

    The default behaviour is to create a StreamHandler which writes to
    sys.stderr, set a formatter using the BASIC_FORMAT format string, and
    add the handler to the root logger.

    A number of optional keyword arguments may be specified, which can alter
    the default behaviour.

    filename  Specifies that a FileHandler be created, using the specified
              filename, rather than a StreamHandler.
    filemode  Specifies the mode to open the file, if filename is specified
              (if filemode is unspecified, it defaults to 'a').
    format    Use the specified format string for the handler.
    datefmt   Use the specified date/time format.
    level     Set the root logger level to the specified level.
    stream    Use the specified stream to initialize the StreamHandler. Note
              that this argument is incompatible with 'filename' - if both
              are present, 'stream' is ignored.

    Note that you could specify a stream created using open(filename, mode)
    rather than passing the filename and mode in. However, it should be
    remembered that StreamHandler does not close its stream (since it may be
    using sys.stdout or sys.stderr), whereas FileHandler closes its stream
    when the handler is closed.
    """
    if len(root.handlers) == 0:
        filename = kwargs.get("filename")
        if filename:
            mode = kwargs.get("filemode", 'a')
            hdlr = FileHandler(filename, mode)
        else:
            stream = kwargs.get("stream")
            hdlr = StreamHandler(stream)
        fs = kwargs.get("format", BASIC_FORMAT)
        dfs = kwargs.get("datefmt", None)
        fmt = Formatter(fs, dfs)
        hdlr.setFormatter(fmt)
        root.addHandler(hdlr)
        level = kwargs.get("level")
        if level:
            root.setLevel(level)


/*
Return a logger with the specified name, creating it if necessary.
If no name is specified, return the root logger.
*/
function getLogger(name) {
    if name
        return Logger.manager.getLogger(name);
    else
        return root;
}