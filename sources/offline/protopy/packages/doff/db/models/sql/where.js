/* 'doff.db.models.sql.where' */
require('doff.utils.tree', 'Node');
require('doff.db.models.fields.base', 'Field');
require('doff.db.base', 'connection');
require('doff.db.models.sql.datastructures', 'EmptyResultSet', 'FullResultSet');
require('doff.db.models.query_utils', 'QueryWrapper');
        
var AND = 'AND',
    OR = 'OR';

var WhereNode = type('WhereNode', Node, {

    default_connector: AND,

    /* Los datos vienen en un objeto */
    'add': function add(data, connector) {
        if (!isinstance(data, Array)) {
            super(Node, this).add(data, connector);
            return;
        }

        var [alias, column, field, lookup_type, value] = data;
        var params = null, db_type = null;

        try {
            if (field) {
                params = field.get_db_prep_lookup(lookup_type, value);
                db_type = field.db_type();
            } else {
                field = new Field();
                params = field.get_db_prep_lookup(lookup_type, value);
                db_type = null;
            }
        } catch (e) {
            super(Node, this).add(new NothingNode(), connector);
        }

        var annotation = null;
        if (value instanceof Date)
            annotation = new Date();
        else
            annotation = new bool(value);

        super(Node, this).add([alias, column, db_type, lookup_type, annotation, params], connector);
    },
    
    '__str__': function __str__(){
        var q = this.as_sql();
        return q[0].subs(q[1]);
    },
            
    'as_sql': function as_sql(qn){

        if (!qn)
            var qn = getattr(connection.ops, 'quote_name');
        if (!bool(this.children))
            return [null, []];
        
        var result = [],
            result_params = [],
            empty = true,
            sql_params = null;
        for (var i=0; i < this.children.length; i++) {
            var child = this.children[i];
            try {
                if (child['as_sql'])
                    sql_params = child.as_sql(qn);
                else
                    sql_params = this.make_atom(child, qn);
            } catch (e if e instanceof EmptyResultSet) {
                if (this.connector == AND && !this.negated)
                    throw e;
                else if (this.negated)
                    empty = false;
                continue;
            } catch (e if e instanceof FullResultSet) {
                if (this.connector == OR) {
                    if (this.negated) {
                        empty = true;
                        break;
                    }
                    return ['', []];
                }
                if (this.negated)
                    empty = true;
                continue;
            }
            empty = false;
            if (sql_params[0])
                result.push(sql_params[0]);
                result_params = result_params.concat(sql_params[1]);
        }
        
        if (empty)
            throw new EmptyResultSet();

        var conn = ' %s '.subs(this.connector);
        var sql_string = result.join(conn);
        if (sql_string) {
            if (this.negated)
                sql_string = 'NOT (%s)'.subs(sql_string);
            else if (this.children.length != 1)
                sql_string = '(%s)'.subs(sql_string);
        }
        return [sql_string, result_params];
    },

    'make_atom': function make_atom(child, qn) {
        var lhs = null, cast_sql = null, extra = null;
        var [table_alias, name, db_type, lookup_type, value_annot, params] = child;
            
        if (table_alias)
            lhs = '%s.%s'.subs([qn(table_alias), qn(name)]);
        else
            lhs = qn(name);
        var field_sql = connection.ops.field_cast_sql(db_type).subs(lhs);

        if (value_annot instanceof Date)
            cast_sql = connection.ops.date_cast_sql();
        else
            cast_sql = '%s';

        if (params instanceof QueryWrapper) {
            extra = params.data;
            extra = extra[0];
            params = extra[1];
        }
        else
            extra = '';

        if (connection.operators[lookup_type]){
            var format = "%s %%s %s".subs(connection.ops.lookup_cast(lookup_type), extra);
            return [format.subs(field_sql, connection.operators[lookup_type].subs(cast_sql)), params];
        }
        if (lookup_type == 'in') {
            if (!value_annot)
                throw new EmptyResultSet();
            if (extra)
                return ['%s IN %s'.subs(field_sql, extra), params];
            return ['%s IN (%s)'.subs(field_sql, '%s'.times(params.length, ', ')), params];
        }
        else if (include(['range', 'year'], lookup_type))
            return ['%s BETWEEN %%s and %%s'.subs(field_sql), params];
        else if (include(['month', 'day'], lookup_type))
            return ['%s = %%s'.subs(connection.ops.date_extract_sql(lookup_type, field_sql)), params];
        else if (lookup_type == 'isnull')
            return ['%s IS %sNULL'.subs(field_sql, (! value_annot && 'NOT ' || '')), []];
        else if (lookup_type == 'search')
            return [connection.ops.fulltext_search_sql(field_sql), params];
        else if (include(['regex', 'iregex'], lookup_type))
            return [connection.ops.regex_lookup(lookup_type).subs(field_sql, cast_sql), params];

        throw new TypeError('Invalid lookup_type: ' + lookup_type);
    },

    'relabel_aliases': function relabel_aliases(change_map, node) {
    
        if (!node)
            node = this;
        for (var [index, child] in Iterator(node.children)) {
            if (child['relabel_aliases'])
                child.relabel_aliases(change_map);
            else if (child instanceof Node)
                this.relabel_aliases(change_map, child);
            else
                if (child[0] in change_map)
                    node.children[index] = [change_map[child[0]]].concat(child.slice(1, child.length));
        }
    }
});

var EverythingNode = type('EverythingNode', object, {

    'as_sql': function as_sql(qn){
        throw new FullResultSet();
    },

    'relabel_aliases': function relabel_aliases(change_map, node){
        return;
    }
});

var NothingNode = type('NothingNode', object, {

    'as_sql': function as_sql(qn){
        throw new EmptyResultSet();
    },

    'relabel_aliases': function relabel_aliases(change_map, node){
        return;
    }
});

publish({    
    AND: AND,
    OR: OR,
    WhereNode: WhereNode,
    EverythingNode: EverythingNode,
    NothingNode: NothingNode 
});
