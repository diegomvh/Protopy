$L('gears');

var converters = {};
var adapters = {};

function register_converter(type, func) {
    converters[type] = func;
}

function register_adapter(type, func) {
    adapters[type] = func;
}

function connect(options) {
    return new Connection(options);
}

var Connection = Class('Connection', {
    __init__: function(options) {
        this.database = options['database'];
        this.detect_types = options['detect_types'];
        this.factory = options['factory'] || Cursor;
    },

    create_function: function() {},
    
    cursor: function() {
        try {
            var connection = google.gears.factory.create('beta.database');
            connection.open(this.database);
        } catch(e) {
            throw new Error("couldn`t open database: " + name + " exception: " + e.message);
        }
        var cur = new this.factory(connection);
        return cur;
    }
});

var Cursor = Class('Cursor', {
    __init__: function(connection){
            this.connection = connection;
            this.__defineGetter__('lastrowid', function(){ return this.connection.lastInsertRowId; });
            this.__defineGetter__('rowsAffected', function(){ return this.connection.rowsAffected; });
            this.lastResulSet = null;
    },
    
    close: function(){
        try {
            this.connection.close();
        }
        catch(e) {
            throw new Error(e.message);
        }
    },

    remove: function(){
        try {
            this.connection.remove();
        }
        catch(e) {
            throw new Error(e.message);
        }
    },
    
    execute: function(query, params){
        params = params || [];
        try {
            this.lastResulSet = this.connection.execute(query, params);
        }
        catch(e) {
            throw new Error(e.message);
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
        return array(this);
    },

    next: function() {
        //FIXME: or not :) can return objects multi asoc
        if (this.lastResulSet == null)
            throw StopIteration;
        if (!this.lastResulSet.isValidRow()) throw StopIteration;
        var tupla = {};
        for (var i = 0, length = this.lastResulSet.fieldCount(); i < length; i++) {
            var name = this.lastResulSet.fieldName(i);
            var value = this.lastResulSet.field(i);
            tupla[name] = value;
            tupla[i] = value;
        }
        this.lastResulSet.next();
        return tupla;
    }
});

$P({    'connect': connect,
        'register_converter': register_converter,
        'register_adapter': register_adapter,
        'Cursor': Cursor,
        'DatabaseError': Class('DatabaseError'),
        'IntegrityError': Class('IntegrityError')  });