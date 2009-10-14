/* 'doff.template' */
require('doff.template.context', 'Context', 'ContextPopException');
require('doff.core.project', 'get_settings');
require('functional', 'curry');

var settings = get_settings();

var libraries = {};
var builtins = [];

var TOKEN_TEXT = 0,
    TOKEN_VAR = 1,
    TOKEN_BLOCK = 2,
    TOKEN_COMMENT = 3,
    FILTER_SEPARATOR = '|',
    FILTER_ARGUMENT_SEPARATOR = ':',
    VARIABLE_ATTRIBUTE_SEPARATOR = '.',
    BLOCK_TAG_START = '{%',
    BLOCK_TAG_END = '%}',
    VARIABLE_TAG_START = '{{',
    VARIABLE_TAG_END = '}}',
    COMMENT_TAG_START = '{#',
    COMMENT_TAG_END = '#}',
    SINGLE_BRACE_START = '{',
    SINGLE_BRACE_END = '}';

var UNKNOWN_SOURCE = "&lt;unknown source&gt;";

var tag_re = new RegExp('(%s.*?%s|%s.*?%s|%s.*?%s)'.subs(BLOCK_TAG_START, BLOCK_TAG_END,
                                      VARIABLE_TAG_START, VARIABLE_TAG_END,
                                      COMMENT_TAG_START, COMMENT_TAG_END));

var TemplateSyntaxError = type('TemplateSyntaxError', [ Exception ]);

var TemplateDoesNotExist = type('TemplateDoesNotExist', [ Exception ]);

var TemplateEncodingError = type('TemplateEncodingError', [ Exception ]);

var VariableDoesNotExist = type('VariableDoesNotExist', [ Exception ]);

var InvalidTemplateLibrary = type('InvalidTemplateLibrary', [ Exception ]);

/* ------------------ Nodos ----------------- */
var Node = type('Node', [ object ], {
    must_be_first: false,
    render: function(context) { },

    __iter__: function() { 
        yield this; 
    },

    get_nodes_by_type: function(nodetype){
        var nodes = [];
        if (isinstance(this, nodetype))
            nodes.push(this);
        if (this['nodelist'])
            nodes = nodes.concat(this.nodelist.get_nodes_by_type(nodetype));
        return nodes;
    }
});

var NodeList = type('NodeList', [ object ], {
    contains_nontext: false,

    __init__: function() {
        this.nodes = [];
    },

    __iter__: function() {
        for each (var node in this.nodes)
            yield node;
    },

    push: function(node){
        this.nodes.push(node);
    },

    pop: function(){
        return this.nodes.pop();
    },

    render: function(context) {
        var bits = [];
        for each (var node in this.nodes) {
            if (isinstance(node, Node))
                bits.push(this.render_node(node, context));
            else
                bits.push(node);
        }
        return bits.join('');
    },

    render_node: function(node, context) {
        return node.render(context);
    },

    get_nodes_by_type: function(nodetype) {
        var nodes = [];
        for each (var node in this.nodes) {
            nodes = nodes.concat(node.get_nodes_by_type(nodetype));
        }
        return nodes;
    }
});

var TextNode = type('TextNode', [ Node ], {
    __init__: function(s) {
        this.s = s;
    },

    render: function(context) { 
        return this.s;
    }
});

var VariableNode = type('VariableNode', [ Node ], {
    __init__: function(filter_expression) {
        this.filter_expression = filter_expression;
    },

    render: function(context) {
        return this.filter_expression.resolve(context);
    }
});

/* ---------------- Template ----------------- */
function compile_string(template_string) {
    var lexer = new Lexer(template_string);
    var parser = new Parser(lexer.tokenize());
    return parser.parse();
}

var Template = type('Template', [ object ], {
    __init__: function(template, name) {
        this.nodelist = compile_string(template);
        this.name = name || '<Unknown Template>';
    },

    __iter__: function() {
        for each (var node in this.nodelist)
            for each (var subnode in node)
                yield subnode;
    },

    render: function(context) {
        return this.nodelist.render(context);
    }
});

var Token = type('Token', [ object ], {
    __init__: function(token_type, contents) {
        this.token_type = token_type;
        this.contents = contents;
    },

    __str__: function() {
        return '<%s token: "%s...">'.subs({TOKEN_TEXT: 'Text', TOKEN_VAR: 'Var', TOKEN_BLOCK: 'Block', TOKEN_COMMENT: 'Comment'}[this.token_type], this.contents.substr(0, 20).replace('\n', ''));
    },

    split_contents: function() {
        var bits = this.contents.split(/\s+/);
        return bits;
    }
});

var Lexer = type('Lexer', [ object ], {
    __init__: function(template_string) {
        this.template_string = template_string;
    },

    tokenize: function() {
        var in_tag = false;
        var result = [];
        for each (var bit in this.template_string.split(tag_re)) {
            if (bool(bit))
                result.push(this.create_token(bit, in_tag));
            in_tag = ! in_tag;
        }
        return result;
    },

    create_token: function(token_string, in_tag){
        if (in_tag){
            if (token_string.startswith(VARIABLE_TAG_START))
                var token = new Token(TOKEN_VAR, token_string.substring(VARIABLE_TAG_START.length, token_string.length - VARIABLE_TAG_END.length).strip());
            else if (token_string.startswith(BLOCK_TAG_START))
                var token = new Token(TOKEN_BLOCK, token_string.substring(BLOCK_TAG_START.length, token_string.length - BLOCK_TAG_END.length).strip());
            else if (token_string.startswith(COMMENT_TAG_START))
                var token = new Token(TOKEN_COMMENT, '');
        } else
            var token = new Token(TOKEN_TEXT, token_string);
        return token;
    }
});

var Parser = type('Parser', [ object ], {
    __init__: function(tokens) {
        this.tokens = tokens;
        this.tags = {};
        this.filters = {};
        //Si no estan cargados los builtins los cargo
        if (!bool(builtins)) {
            for each (var module_name in ['doff.template.default_tags', 'doff.template.loader_tags', 'doff.template.default_filters'])
                builtins.push(get_library(module_name));
        }
        for each (var lib in builtins)
            this.add_library(lib);
    },

    parse: function(parse_until) {
        parse_until = parse_until || [];
        var nodelist = this.create_nodelist();
        while (bool(this.tokens)){
            var token = this.next_token();
            if (token.token_type == TOKEN_TEXT)
                this.extend_nodelist(nodelist, new TextNode(token.contents), token);
            else if (token.token_type == TOKEN_VAR) {
                if (!token.contents)
                    this.empty_variable(token);
                var filter_expression = this.compile_filter(token.contents);
                var var_node = this.create_variable_node(filter_expression);
                this.extend_nodelist(nodelist, var_node, token);
            } else if (token.token_type == TOKEN_BLOCK) {
                if (include(parse_until, token.contents)){
                    this.prepend_token(token);
                    return nodelist;
                }
                var command = null,
                    compiled_func = null,
                    compiled_result = null;
                try{
                    command = token.split_contents()[0];
                } catch(e){
                    this.empty_block_tag(token);
                }
                this.enter_command(command, token);
                compiled_func = this.tags[command];
                if (!compiled_func){
                    this.invalid_block_tag(token, command);
                }
                try{
                    compiled_result = compiled_func(this, token);
                } catch (e){
                    if (!this.compile_function_error(token, e))
                        throw e;
                }
                this.extend_nodelist(nodelist, compiled_result, token);
                this.exit_command();
            }
        }
        if (bool(parse_until))
            this.unclosed_block_tag(parse_until);
        return nodelist;
    },

    next_token: function() {
        return this.tokens.shift();
    },

    extend_nodelist: function(nodelist, node, token) {
        if (node.must_be_first && nodelist)
            if (nodelist.contains_nontext)
                throw new AttributeError();
        if ((isinstance(nodelist, NodeList)) && !(isinstance(node, TextNode)))
            nodelist.contains_nontext = true;
        nodelist.push(node);
    },

    create_variable_node: function(filter_expression) {
        return new VariableNode(filter_expression);
    },

    create_nodelist: function() {
        return new NodeList();
    },

    enter_command: function(command, token) {},

    exit_command: function() {},

    delete_first_token: function() {
        this.tokens.shift();
    },

    add_library: function(lib) {
        extend(this.tags, lib.tags);
        extend(this.filters, lib.filters);
    },

    error: function(token, msg) {
        return new TemplateSyntaxError(msg);
    },

    invalid_block_tag: function(token, command) {
        throw this.error(token, "Invalid block tag: '%s'".subs(command));
    },

    prepend_token: function(token) {
        this.tokens = [token].concat(this.tokens);
    },

    compile_function_error: function(token, e) {},

    compile_filter: function(token) {
        return new FilterExpression(token, this);
    },

    find_filter: function(filter_name) {
        if (this.filters[filter_name])
            return this.filters[filter_name];
        else
            throw new TemplateSyntaxError("Invalid filter: '%s'".subs(filter_name));
    },

    empty_variable: function(token) {
        throw this.error(token, "Empty variable tag");
    },

    empty_block_tag: function(token) {
        throw this.error(token, "Empty block tag");
    },

    invalid_block_tag: function(token, command) {
        throw this.error(token, "Invalid block tag: '%s'".subs(command));
    },

    unclosed_block_tag: function(parse_until) {
        throw this.error(null, "Unclosed tags: %s ".subs(parse_until.join(', ')));
    },

    skip_past: function(endtag) {
        while (bool(this.tokens)) {
            var token = this.next_token();
            if (token.token_type == TOKEN_BLOCK && token.contents == endtag)
                return;
        }
        this.unclosed_block_tag([endtag]);
    }
});

var filter_re = /("(?:[^"\\]*(?:\\.[^"\\]*)*)"|'(?:[^'\\]*(?:\\.[^'\\]*)*)'|[^\s]+)/g;
var FilterExpression = type('FilterExpression', [ object ], {
    __init__: function(token, parser) {
        /* if (!filter_re.test(token))
            throw new TemplateSyntaxError("Could not parse the remainder: '%s'".subs(token)) */
        this.token = token;
        var split_re = /\|/;
        var tokens = token.split(split_re),
            value = tokens.shift(),
            filters = [];
        /*if (bool(tokens)) {
            tokens = tokens[0].split('|');
        }*/
        for each (var filter in tokens) {
            var parts = filter.split(':');
            var filter_name = parts.shift();
            var filter_func = parser.find_filter(filter_name);
            var args = [];
            for each (var p in parts)
                args.push(new Variable(p));
            this.args_check(filter_name,filter_func, args);
            filters.push([filter_func, args]);
        }
        this.filters = filters;
        this.value = new Variable(value);
    },

    __str__: function() {
        return this.token;
    },

    resolve: function(context, ignore_failures) {
        var ignore_failures = ignore_failures || false;
        var obj = null;
        try {
            obj = this.value.resolve(context);
        } catch (e if isinstance(e, VariableDoesNotExist)) {
            if (ignore_failures) {
                obj = null;
            } else {
                if (settings.TEMPLATE_STRING_IF_INVALID) {
                    if (include(settings.TEMPLATE_STRING_IF_INVALID, '%s'))
                        return settings.TEMPLATE_STRING_IF_INVALID.subs(this.value.value);
                    return settings.TEMPLATE_STRING_IF_INVALID;
                } else {
                    obj = settings.TEMPLATE_STRING_IF_INVALID;
                }
            }
        }
        for each (var [func, args] in this.filters) {
            var arg_vals = [];
            for each (var arg in args)
                arg_vals.push(arg.resolve(context));
            obj = func.apply({}, [obj].concat(arg_vals));
        }
        return obj;
    },

    args_check: function(name, func, provided) {
        return true;
    }
});

var Variable = type('Variable', [ object ], {
    __init__: function(value) {
        this.value = value;
        this.literal = null;
        this.lookups = null;
        this.literal = Number(value);
        if (isNaN(this.literal)) {
            // No es un numero
            if (include(["'", '"'], value[0]) && value[0] == value[value.length - 1]) {
                this.literal = value.substring(1, value.length -1);
            } else {
                this.lookups = value.split(VARIABLE_ATTRIBUTE_SEPARATOR);
            }
        }
    },

    __str__: function() {
        return this.value;
    },

    resolve: function(context){
        if (this.lookups) {
            return this._resolve_lookup(context);
        } else {
            return this.literal;
        }
    },

    _resolve_lookup: function(context) {
        var current = context;
        for each (var bit in this.lookups) {
            try {
                // Si es un Context uso __getitem__.
                if (isinstance(current, Context))
                    current = current.__getitem__(bit);
                else
                    current = getattr(current, bit);
            } catch (e) {
                throw new VariableDoesNotExist("Failed lookup for key [%s] in %s".subs(bit, current))
            }
        }
        if (callable(current))
            current = current();
        return current;
    }
});

function generic_tag_compiler(params, name, node_class, parser, token) {
    /*Returns a template.Node subclass.*/
    var bits = token.split_contents().slice(1);
    var bmax = len(params);
    if(len(bits) > bmax)
        throw new TemplateSyntaxError("%s takes %s arguments".subs(name, bmax));
    return new node_class(bits);
}

var Library = type('Library', [ object ], {
    __init__: function() {
        this.filters = {};
        this.tags = {};
    },

    tag: function(name, compile_function) {
        if (callable(name)) {
            this.tags[name.name] = name;
            return name;
        } else if (name != null && callable(compile_function)) {
            this.tags[name] = compile_function;
            return compile_function;
        } else {
            throw new InvalidTemplateLibrary("Unsupported arguments to Library.tag: (%s, %s)".subs(name, compile_function));
        }
    },

    filter: function(name, filter_func) {
        if (callable(name)){
            this.filters[name.name] = name;
            return name;
        } else if (name != null && callable(filter_func)) {
            this.filters[name] = filter_func;
            return filter_func;
        } else {
            throw new InvalidTemplateLibrary("Unsupported arguments to Library.filter: (%s, %s)".subs(name, filter_func));
        }
    },

    simple_tag: function(func) {
        var params = func.toString().match(/^[\s\(]*function[^(]*\(([^\)]*)\)/)[1].replace(/\s+/g, '').split(',');
        params = params.length == 1 && !params[0] ? [] : params;
       
        var SimpleNode = type('SimpleNode', [ Node ], {
            __init__: function(vars_to_resolve) {
                this.vars_to_resolve = vars_to_resolve.map(function(v) { return new Variable(v); });
            },

            render: function(context) {
                var resolved_vars = [v.resolve(context) for each (v in this.vars_to_resolve)];
                return func.apply(this, resolved_vars);
            }
        });
        var compile_func = curry(generic_tag_compiler, params, func.name, SimpleNode);
        this.tag(func.name, compile_func);
        return func;
    }
});

function get_library(module_name) {
    var lib = libraries[module_name];
    if (!lib) {
        try {
            var mod = require(module_name);
        } catch (e if isinstance(e, LoadError)) {
            throw new InvalidTemplateLibrary("Could not load template library from %s, %s".subs(module_name, e));
        }
        lib = mod.register;
        if (lib) {
            libraries[module_name] = lib;
        } else {
            throw new InvalidTemplateLibrary("Template library %s does not have a variable named 'register'".subs(module_name));
        }
    }
    return lib;
}

publish({
    TemplateSyntaxError: TemplateSyntaxError,
    TemplateDoesNotExist: TemplateDoesNotExist,
    TemplateEncodingError: TemplateEncodingError,
    VariableDoesNotExist: VariableDoesNotExist,
    InvalidTemplateLibrary: InvalidTemplateLibrary,
    Variable: Variable,
    Node: Node,
    TextNode: TextNode,
    NodeList: NodeList,
    Template: Template,
    Library: Library,
    get_library: get_library,
    BLOCK_TAG_START: BLOCK_TAG_START,
    BLOCK_TAG_END: BLOCK_TAG_END ,
    VARIABLE_TAG_START: VARIABLE_TAG_START,
    VARIABLE_TAG_END: VARIABLE_TAG_END,
    SINGLE_BRACE_START: SINGLE_BRACE_START,
    SINGLE_BRACE_END: SINGLE_BRACE_END,
    COMMENT_TAG_START: COMMENT_TAG_START,
    COMMENT_TAG_END: COMMENT_TAG_END
});