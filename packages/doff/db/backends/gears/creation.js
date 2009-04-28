$L('doff.db.backends.creation', 'BaseDatabaseCreation');

var DatabaseCreation = type('DatabaseCreation', BaseDatabaseCreation, {
    data_types: {
        'AutoField':                    'integer',
        'BooleanField':                 'bool',
        'CharField':                    'varchar(%s)',
        'CommaSeparatedIntegerField':   'varchar(%s)',
        'DateField':                    'date',
        'DateTimeField':                'datetime',
        'DecimalField':                 'decimal',
        'FileField':                    'varchar(%s)',
        'FilePathField':                'varchar(%s)',
        'FloatField':                   'real',
        'IntegerField':                 'integer',
        'IPAddressField':               'char(15)',
        'NullBooleanField':             'bool',
        'OneToOneField':                'integer',
        'PositiveIntegerField':         'integer unsigned',
        'PositiveSmallIntegerField':    'smallint unsigned',
        'SlugField':                    'varchar(%s)',
        'SmallIntegerField':            'smallint',
        'TextField':                    'text',
        'TimeField':                    'time'
    },

    'sql_for_pending_references': function sql_for_pending_references(model, pending_references){
        return [];
    },

    'sql_remove_table_constraints': function sql_remove_table_constraints(model, references_to_delete){
        return [];
    }
});

publish({ 
    DatabaseCreation: DatabaseCreation 
});
