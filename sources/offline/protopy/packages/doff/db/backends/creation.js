/**
    * This class encapsulates all backend-specific differences that pertain to
    * database *creation*, such as the column types to use for particular Django
    * Fields, the SQL used to create and destroy tables, and the creation and
    * destruction of test databases.
    */
var BaseDatabaseCreation = type('BaseDatabaseCreation', object, {
    data_types: {},

    '__init__': function __init__(connection){
        this.connection = connection;
    },

    /**
        * Returns the SQL required to create a single model, as a array of:
        * [list_of_sql, pending_references_dict]
        */
    'sql_create_model': function sql_create_model(model, kms){

        var IntegerField = require('doff.db.models.fields.base', 'IntegerField');
        var known_models = (bool(kms))?kms : new Set();

        var opts = model._meta,
            final_output = [],
            table_output = [],
            pending_references = new Dict(),
            qn = this.connection.ops.quote_name,
            field_output = null;

        for each (var f in opts.fields) {

            var col_type = f.db_type();
            if (!col_type)
                return;
            field_output = [qn(f.column), col_type];
            field_output.push('%sNULL'.subs((!f.none)?'NOT ':''));
            if (f.primary_key)
                field_output.push('PRIMARY KEY');
            else if (f.unique)
                field_output.push('UNIQUE');
            if (f.rel){
                var result = this.sql_for_inline_foreign_key_references(f, known_models);
                var ref_output = result[0], pending = result[1];
                if (pending) {
                    if (!pending_references.has_key(f.rel.to)) {
                        pending_references.set(f.rel.to, []);
                    }
                    pending_references.get(f.rel.to).push([model, f]);
                }
                else
                    field_output = field_output.concat(ref_output);
            }
            table_output.push(field_output.join(' '));
        };
        if (opts.order_with_respect_to)
            table_output.push(qn('_order') + ' ' + new IntegerField().db_type() + ' ' + 'NULL');
        for each (var field_constraints in opts.unique_together) {
            table_output.push('UNIQUE (%s)'.subs(field_constraints.collect(function(f){return qn(opts.get_field(f).column);}).join(', ')));
        }
        var full_statement = ['CREATE TABLE' + ' ' + qn(opts.db_table) + ' ('];
        for (var [index, line] in Iterator(table_output))
            full_statement.push('    %s%s'.subs(line, (index < table_output.length - 1)? ',' : ''));
        full_statement.push(')');
        full_statement.push(';');
        final_output.push(full_statement.join('\n'));

        if (opts.has_auto_field) {
            var auto_column = opts.auto_field.db_column || opts.auto_field.name;
            var autoinc_sql = this.connection.ops.autoinc_sql(opts.db_table, auto_column);
            if (bool(autoinc_sql))
                for each (var stmt in autoinc_sql)
                    final_output.push(stmt);
        }
        return [final_output, pending_references];
    },

        /**
        * Return the SQL snippet defining the foreign key reference for a field
        */
    'sql_for_inline_foreign_key_references': function sql_for_inline_foreign_key_references(field, known_models){

        var qn = this.connection.ops.quote_name;
        if (include(known_models, field.rel.to)) {
            var output = ['REFERENCES' + ' ' + qn(field.rel.to._meta.db_table) + ' (' + qn(field.rel.to._meta.get_field(field.rel.field_name).column) + ')' + this.connection.ops.deferrable_sql()];
            var pending = false;
        }
        else {
            var output = [];
            var pending = true;
        }

        return [output, pending];

    },

        /**
        * Returns any ALTER TABLE statements to add constraints after the fact.
        */
    'sql_for_pending_references': function sql_for_pending_references(model, pending_references){
        var qn = this.connection.ops.quote_name,
            final_output = [],
            opts = model._meta;
        if (pending_references.has_key(model)){
            for (var [rel_class, f] in pending_references) {
                var rel_opts = rel_class._meta;
                var r_table = rel_opts.db_table;
                var r_col = f.column;
                var table = opts.db_table;
                var col = opts.get_field(f.rel.field_name).column;
                var r_name = '%s_refs_%s_%s'.subs(r_col, col, hash(r_table + table));
                final_output.push('ALTER TABLE' + ' %s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s (%s)%s;'.subs(qn(r_table), truncate_name(r_name, this.connection.ops.max_name_length()), qn(r_col), qn(table), qn(col), this.connection.ops.deferrable_sql()));
            }
            pending_references.unset(model);
        }
        return final_output;
    },

    /**
        * Return the CREATE TABLE statments for all the many-to-many tables defined on a model
        */
    'sql_for_many_to_many': function sql_for_many_to_many(model) {
        var output = [];
        for each (var f in model._meta.local_many_to_many) {
            output = output.concat(this.sql_for_many_to_many_field(model, f));
        }
        return output;
    },
    /**
        * Return the CREATE TABLE statements for a single m2m field
        */
    'sql_for_many_to_many_field': function sql_for_many_to_many_field(model, f){

        var AutoField = require('doff.db.models.fields.base', 'AutoField');

        var output = [];
        if (f.creates_table) {
            var opts = model._meta,
                qn = this.connection.ops.quote_name,
                table_output = ['CREATE TABLE' + ' ' + qn(f.m2m_db_table()) + ' ('];
            table_output.push('    %s %s %s,'.subs(
                qn('id'),
                new AutoField({'primary_key':true}).db_type(),
                'NOT NULL PRIMARY KEY'));

            var [inline_output, deferred] = this.sql_for_inline_many_to_many_references(model, f)
            table_output = table_output.concat(inline_output);

            table_output.push('    %s (%s, %s)'.subs
                ('UNIQUE',
                qn(f.m2m_column_name()),
                qn(f.m2m_reverse_name())));
            table_output.push(')');
            table_output.push(';');
            output.push(table_output.join('\n'));

            for each (var d in deferred) {
                var r_table = d[0], r_col = d[1], table = d[2], col = d[3];
                r_name = '%s_refs_%s_%s'.subs(r_col, col, hash(r_table + table));
                output.push('ALTER TABLE %s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s (%s)%s;'.subs(
                qn(r_table),
                truncate_name(r_name, this.connection.ops.max_name_length()),
                qn(r_col), qn(table), qn(col),
                this.connection.ops.deferrable_sql()));
            }
            /* Add any extra SQL needed to support auto-incrementing PKs */
            autoinc_sql = this.connection.ops.autoinc_sql(f.m2m_db_table(), 'id');
            if (bool(autoinc_sql))
                for each (var stmt in autoinc_sql)
                    output.push(stmt);
        }
        return output;
    },

    /**
        * Create the references to other tables required by a many-to-many table
        */
    'sql_for_inline_many_to_many_references': function sql_for_inline_many_to_many_references(model, field){

        var ForeignKey = require('doff.db.models.fields.related', 'ForeignKey');

        var opts = model._meta,
            qn = this.connection.ops.quote_name;

        var table_output = [
            '    %s %s %s %s (%s)%s,'.subs(
                [qn(field.m2m_column_name()),
                new ForeignKey(model).db_type(),
                'NOT NULL REFERENCES',
                qn(opts.db_table),
                qn(opts.pk.column),
                this.connection.ops.deferrable_sql()]),
            '    %s %s %s %s (%s)%s,'.subs(
                [qn(field.m2m_reverse_name()),
                new ForeignKey(field.rel.to).db_type(),
                'NOT NULL REFERENCES',
                qn(field.rel.to._meta.db_table),
                qn(field.rel.to._meta.pk.column),
                this.connection.ops.deferrable_sql()])
        ]
        var deferred = [];

        return [table_output, deferred];
    },

    /**
        * Returns the CREATE INDEX SQL statements for a single model
        */
    'sql_indexes_for_model': function sql_indexes_for_model(model){
        var output = [];
        for each (var f in model._meta.local_fields) {
            output = output.concat(this.sql_indexes_for_field(model, f));
        }
        return output;
    },

    /**
        * Return the CREATE INDEX SQL statements for a single model field
        */
    'sql_indexes_for_field': function sql_indexes_for_field(model, f) {
        if (f.db_index && !f.unique) {
            var qn = this.connection.ops.quote_name;
            var output = ['CREATE INDEX ' +
                qn('%s_%s'.subs(model._meta.db_table, f.column)) + ' ' +
                'ON ' +
                qn(model._meta.db_table) + ' ' +
                "(%s);".subs(qn(f.column))];
        }
        else
            output = [];
        return output;
    },

    /**
        * Return the DROP TABLE and restraint dropping statements for a single model
        */
    'sql_destroy_model': function sql_destroy_model(model, references_to_delete){

        var qn = this.connection.ops.quote_name;
        var output = ['%s %s;'.subs('DROP TABLE', qn(model._meta.db_table))];
        if (include(references_to_delete, model))
            output.concat(this.sql_remove_table_constraints(model, references_to_delete));

        if (model._meta.has_auto_field)
            var ds = this.connection.ops.drop_sequence_sql(model._meta.db_table);
            if (ds) output.push(ds);
        return output;
    },

    'sql_remove_table_constraints': function sql_remove_table_constraints(model, references_to_delete){

        var output = [];
        var qn = this.connection.ops.quote_name;
        for (var [rel_class, f] in references_to_delete) {
            var table = rel_class._meta.db_table;
            var col = f.column;
            var r_table = model._meta.db_table;
            var r_col = model._meta.get_field(f.rel.field_name).column;
            var r_name = '%s_refs_%s_%s'.subs(col, r_col, hash(table + r_table));
            output.push('%s %s %s %s;'.subs(
                'ALTER TABLE',
                qn(table),
                this.connection.ops.drop_foreignkey_sql(),
                truncate_name(r_name, this.connection.ops.max_name_length())));
        }
        references_to_delete.unset(model);
        return output;
    },

    /*
        * Returns the DROP TABLE statements for a single m2m field
        */
    'sql_destroy_many_to_many': function sql_destroy_many_to_many(model, f) {

        var qn = this.connection.ops.quote_name;
        var output = [];
        if (f.creates_table)
            output.push("%s %s;".subs('DROP TABLE', qn(f.m2m_db_table())));
            var ds = this.connection.ops.drop_sequence_sql("%s_%s".subs(model._meta.db_table, f.column))
            if (ds) output.push(ds);
        return output;
    }
});
    
publish({ 
    BaseDatabaseCreation: BaseDatabaseCreation 
});