$D('doff.db.backends.gears.base');

$L('gears.database');
$L('doff.db.backends.util');
$L('doff.db.backends.*', 'BaseDatabaseFeatures', 'BaseDatabaseOperations', 'BaseDatabaseWrapper', 'BaseDatabaseValidation');
$L('doff.db.backends.gears.creation', 'DatabaseCreation');
$L('doff.db.backends.gears.introspection', 'DatabaseIntrospection');
$L('logging.*');

var logger = logging.get_logger(__name__);
var DatabaseError = database.DatabaseError;
var IntegrityError = database.IntegrityError;

var DatabaseOperations = type('DatabaseOperations', BaseDatabaseOperations, {
    //TODO: le faltan cosas
    'autoinc_sql': function autoinc_sql(table, column){
        return null;
    },

    'drop_foreignkey_sql': function drop_foreignkey_sql(){
        return "";
    },

    'pk_default_value': function pk_default_value(){
        return 'NULL';
    },

    'quote_name': function quote_name(name){
        if (name.startswith('"') && name.endswith('"'))
            return name;
        return '"%s"'.subs(name);
    },

    'no_limit_value': function no_limit_value(){
        return -1;
    },

    'year_lookup_bounds': function year_lookup_bounds(value){
        var first = '%s-01-01',
            second = '%s-12-31 23:59:59.999999';
        return [first.subs(value), second.subs(value)];
    }
});

var DatabaseFeatures = type('DatabaseFeatures', BaseDatabaseFeatures, {
    can_use_chunked_reads: false,
    can_read_columns_name: true
});

var DatabaseWrapper = type('DatabaseWrapper', BaseDatabaseWrapper, {

    operators: {
        'exact': '= %s',
        'iexact': "LIKE %s ESCAPE '\\'",
        'contains': "LIKE %s ESCAPE '\\'",
        'icontains': "LIKE %s ESCAPE '\\'",
        'regex': 'REGEXP %s',
        'iregex': "REGEXP '(?i)' || %s",
        'gt': '> %s',
        'gte': '>= %s',
        'lt': '< %s',
        'lte': '<= %s',
        'startswith': "LIKE %s ESCAPE '\\'",
        'endswith': "LIKE %s ESCAPE '\\'",
        'istartswith': "LIKE %s ESCAPE '\\'",
        'iendswith': "LIKE %s ESCAPE '\\'"
    },

    '__init__': function __init__(settings){
        super(BaseDatabaseWrapper, this).__init__(settings);
        this.features = new DatabaseFeatures();
        this.ops = new DatabaseOperations();
        this.creation = new DatabaseCreation(this);
        this.introspection = new DatabaseIntrospection(this);
        this.validation = new BaseDatabaseValidation();
    },

    '_cursor': function _cursor(settings) {
        if (this.connection == null) {
            if (!bool(settings.DATABASE_NAME)) {
                $L('doff.core.exceptions', 'ImproperlyConfigured');
                throw new ImproperlyConfigured("Please fill out DATABASE_NAME in the settings module before using the database.");
            }
            var args = {
                'database': settings.DATABASE_NAME,
                'detect_types': settings.PARSE_DECLTYPES | settings.PARSE_COLNAMES,
                'factory': GearsCursorWrapper
            }
            extend(args, this.options || {});
            this.connection = database.connect(args);
            // Register extract, date_trunc, and regexp functions.
            //this.connection.create_function("django_extract", 2, _sqlite_extract);
            //this.connection.create_function("django_date_trunc", 2, _sqlite_date_trunc);
            //this.connection.create_function("regexp", 2, _sqlite_regexp);
        }
        return this.connection.cursor();
    }
});

var GearsCursorWrapper = type('GearsCursorWrapper', database.Cursor, {
    'execute': function execute(query, params) {
        params = params || [];
        try {
            query = this.convert_query(query, params.length);

            logger.debug('Query: %s\nParams: %s', query, params, {});
            logger.info('Query: %s\nParams: %s', query, params, {});
            logger.warning('Query: %s\nParams: %s', query, params, {});
            logger.error('Query: %s\nParams: %s', query, params, {});
            super(database.Cursor, this).execute(query, params);
        }
        catch(e) {
            throw new Error(e.message);
        }
    },

    'executemany': function executemany(query, param_list) {
        try {
            var query = this.convert_query(query, param_list[0].length);
            for each (var params in param_list)
                super(database.Cursor, this).executemany(query, params);
        } catch (e) {}
        return null;
    },

    'convert_query': function convert_query(query, num_params){
        return query.subs(mult(["?"], num_params));
    }
});

function _sqlite_extract(lookup_type, dt) {
    if (dt == null)
        return null;
    try {
        dt = util.typecast_timestamp(dt);
    } catch (e if e instanceof ValueError || e instanceof TypeError) {
        return null;
    }
    return dt[lookup_type];
}

function _sqlite_date_trunc(lookup_type, dt) {
    try {
        dt = util.typecast_timestamp(dt);
    } catch (e if e instanceof ValueError || e instanceof TypeError) {
        return null;
    }
    if (lookup_type == 'year')
        return '%i-01-01 00:00:00'.subs(dt.getYear());
    else if (lookup_type == 'month')
        return '%i-%02i-01 00:00:00'.subs(dt.getYear(), dt.getMonth());
    else if (lookup_type == 'day')
        return '%i-%02i-%02i 00:00:00'.subs(dt.getYear(), dt.getMonth(), dt.getDay());
}

function _sqlite_regexp(re_pattern, re_string) {
    try {
        return bool(re_string.search(re_pattern));
    } catch (e) { return false; }
}

var field_cast_sql = function(value){return '%s';};

$P({	
    'DatabaseWrapper': DatabaseWrapper,
    'field_cast_sql': field_cast_sql,
    'DatabaseError': DatabaseError,
    'IntegrityError': IntegrityError 
});