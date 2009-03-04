var rev_typecast_boolean = function(obj, d) { return obj && '1' || '0'; };

var rev_typecast_decimal = function(d) {
    if (!d)
        return null;
    return new String(d);
};

/*
 * Shortens a string to a repeatable mangled version with the given length.
 */
var truncate_name = function(name, length) {

    if (!length || (name.length <= length))
        return name;

    //TODO: un hash del nombre
    var hash = name;

    return '%s%s'.subs(name.substr(0,length-4), hash);
};

/*
 * Formats a number into a string with the requisite number of digits and decimal places.
 */
var format_number = function(value, max_digits, decimal_places) {
    //TODO: format del numero
    return value;
};

$P({    'rev_typecast_boolean': rev_typecast_boolean,
        'rev_typecast_decimal': rev_typecast_decimal,
        'truncate_name': truncate_name,
        'format_number': format_number  });

/*
class CursorDebugWrapper(object):
    def __init__(self, cursor, db):
        self.cursor = cursor
        self.db = db # Instance of a BaseDatabaseWrapper subclass

    def execute(self, sql, params=()):
        start = time()
        try:
            return self.cursor.execute(sql, params)
        finally:
            stop = time()
            sql = self.db.ops.last_executed_query(self.cursor, sql, params)
            self.db.queries.append({
                'sql': sql,
                'time': "%.3f" % (stop - start),
            })

    def executemany(self, sql, param_list):
        start = time()
        try:
            return self.cursor.executemany(sql, param_list)
        finally:
            stop = time()
            self.db.queries.append({
                'sql': '%s times: %s' % (len(param_list), sql),
                'time': "%.3f" % (stop - start),
            })

    def __getattr__(self, attr):
        if attr in self.__dict__:
            return self.__dict__[attr]
        else:
            return getattr(self.cursor, attr)

    def __iter__(self):
        return iter(self.cursor)

###############################################
# Converters from database (string) to Python #
###############################################

def typecast_date(s):
    return s and datetime.date(*map(int, s.split('-'))) or None # returns None if s is null

def typecast_time(s): # does NOT store time zone information
    if not s: return None
    hour, minutes, seconds = s.split(':')
    if '.' in seconds: # check whether seconds have a fractional part
        seconds, microseconds = seconds.split('.')
    else:
        microseconds = '0'
    return datetime.time(int(hour), int(minutes), int(seconds), int(float('.'+microseconds) * 1000000))

def typecast_timestamp(s): # does NOT store time zone information
    # "2005-07-29 15:48:00.590358-05"
    # "2005-07-29 09:56:00-05"
    if not s: return None
    if not ' ' in s: return typecast_date(s)
    d, t = s.split()
    # Extract timezone information, if it exists. Currently we just throw
    # it away, but in the future we may make use of it.
    if '-' in t:
        t, tz = t.split('-', 1)
        tz = '-' + tz
    elif '+' in t:
        t, tz = t.split('+', 1)
        tz = '+' + tz
    else:
        tz = ''
    dates = d.split('-')
    times = t.split(':')
    seconds = times[2]
    if '.' in seconds: # check whether seconds have a fractional part
        seconds, microseconds = seconds.split('.')
    else:
        microseconds = '0'
    return datetime.datetime(int(dates[0]), int(dates[1]), int(dates[2]),
        int(times[0]), int(times[1]), int(seconds), int(float('.'+microseconds) * 1000000))

def typecast_boolean(s):
    if s is None: return None
    if not s: return False
    return str(s)[0].lower() == 't'

def typecast_decimal(s):
    if s is None or s == '':
        return None
    return decimal.Decimal(s)

*/