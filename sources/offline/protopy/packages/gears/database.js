require('sys');

var database = sys.gears._factory.create('beta.database');

database.DatabaseError = type('DatabaseError', [ Exception ]);
database.IntegrityError = type('IntegrityError', [ Exception ]);

database.Connection = type('Connection', [ object ], {
    __init__: function(options) {
        this.database = options['database'];
        this.detect_types = options['detect_types'];
        this.factory = options['factory'] || database.Cursor;
        this.connection = null;
        this.transaction = false;
        this.open();
    },

    open: function() {
        if (this.connection == null) {
            try {
                this.connection = database;
                this.connection.open(this.database);
            } catch(ex) {
                throw new Exception("couldn`t open database: " + name + " exception: " + ex.message || ex.description || String(ex));
            }
        }
    },

    close: function() {
        if (this.connection != null) {
            try {
                this.connection.close();
            } catch(e) {
                throw new database.DatabaseError(e.message);
            }
        }
    },

    remove: function() {
        try {
            this.connection.remove();
            this.connection = null;
        } catch(e) {
            throw new database.DatabaseError(e.message);
        }
    },

    execute: function(query, params) {
        try {
            this.connection.execute(query, params);
        }
        catch(e) {
            throw new Exception(e.message);
        }
    },
    
    cursor: function() {
        var cur = new this.factory(this.connection);
        return cur;
    },

    commit: function() {
    	this.connection.execute('COMMIT');
    },

    rollback: function() {
    	this.connection.execute('ROLLBACK');
    }
});

database.Row = type('Row', [ object ], {
    __init__: function() {
        this._database_columns = [];
    },
    __iter__: function() {
        for each (var column in this._database_columns)
            yield this[column];
    },
    __object__: function() {
        var obj = new Object();
        for each (var column in this._database_columns)
            obj[column] = this[column];
        return obj;
    }
});

database.Cursor = type('Cursor', [ object ], {
    __init__: function(connection){
        this.connection = connection;
        this.lastResulSet = null;
    },

    get lastrowid(){
        return this.connection.lastInsertRowId;
    },

    get rowsAffected(){
        return this.connection.rowsAffected;
    },

    execute: function(query, params) {
        params = params || [];
        try {
            this.lastResulSet = this.connection.execute(query, params);
        }
        catch(e) {
            throw new Exception(e.message);
        }
    },

    executemany: function(query, param_list) {
        try {
            for each (var params in param_list)
                this.connection.execute(query, params);
        } catch (e) {}
        return null;
    },

    fetchone: function(){
        try {
            return this.next();
        } catch (stop) { 
            return null 
        };
    },

    fetchmany: function(chunk_size) {
        if (!chunk_size) return this.fetchone();
        if (!this.lastResulSet.isValidRow() || this.lastResulSet.fieldCount() == 0) return [];
        var result = [];
        try {
            for (var i = 0; i < chunk_size; i++){
                result.push(this.next());
            }
        } catch (stop) {
            return result;
        };
    },

    fetchall: function(){
        if (!this.lastResulSet.isValidRow() || this.lastResulSet.fieldCount() == 0) return [];
        var result = [];
        var result = [];
        try {
            while (true)
                result.push(this.next());
        } catch (stop) {
            return result;
        };
    },

    next: function() {
        if (this.lastResulSet == null)
            throw StopIteration;
        if (!this.lastResulSet.isValidRow()) throw StopIteration;
        var row = new database.Row();
        for (var i = 0, length = this.lastResulSet.fieldCount(); i < length; i++) {
            var name = this.lastResulSet.fieldName(i);
            var value = this.lastResulSet.field(i);
            row._database_columns.push(name);
            row[name] = value;
        }
        this.lastResulSet.next();
        return row;
    }
});

database.connect = function(options) { return new database.Connection(options); },

publish({
    database: database
});