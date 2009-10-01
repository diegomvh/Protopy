/* 'HTML utilities suitable for global use.' */
require('dom');
require('event');
require('ajax');
require('sys');
require('doff.utils.http');
//http://www.contentwithstyle.co.uk/content/fixing-the-back-button-and-enabling-bookmarking-for-ajax-apps

var History = type('History', [ object ], {
    __init__: function(initial) {
        this.states = {};
        this.initial_state = initial || 'index';
        this._current_state = location.hash.slice(1) || this.initial_state;
        window.setInterval(getattr(this, '_hash_check'), 50);
    },

    _hash_check: function() {
        var newHash = location.hash.slice(1) || this.initial_state;
        if (newHash !== this._current_state && !isundefined(this.states[newHash])) {
            this._current_state = newHash;
            this.onChange(this.states[this._current_state]);
        }
    },

    onChange: function(object) {},

    get current_state() {
        return (this._current_state === this.initial_state)? '' : this._current_state;
    },

    navigate: function (state, object) {
        state = state || this.initial_state;
        this._current_state = state;
        location.hash = state;
        this.states[state] = object;
    }
});

var Document = type('Document', [ object ], {
    __init__: function() {
        this.head = document.createElement('div');
        this.head.id = "head";
        this.body = document.createElement('div');
        this.body.id = "body";
        // Apagando la chache del selector
        dom.cache(false);
        $$('body')[0].insert(this.head);
        $$('body')[0].insert(this.body);
    },

    update: function(content) {
        var head = content.match(new RegExp('<head[^>]*>([\\S\\s]*?)<\/head>', 'im'));
        if (head)
            this.head.update(head[1]);
        var body = content.match(new RegExp('<body[^>]*>([\\S\\s]*?)<\/body>', 'im'));
        if (body)
            this.body.update(body[1]);
        else 
            this.body.update(content);
        this.forms = this.body.select('FORM');
        this.links = this.body.select('A');
    }
});

var DOMAdapter = type('DOMAdapter', [ object ], {
    event_handlers: [],

    __init__: function() {
        $$('body')[0].update('');
        this._location = window.location;
        this.history = new History();
        this.document = new Document();
        event.connect(this.history, 'onChange', this, '_process_from_history');
    },

    send: function(request) {},

    receive: function(response) {
        if (response.status_code == 200) {
            this.remove_hooks();
            this.document.update(response.content);
            this.add_hooks();
        } else if (response.status_code == 302) {
            return this._process_from_string(response['Location']);
        } else if (response.status_code == 404) {
            //Agregar a las url no manjeadas
            //value.setOpacity(0.2);
            return this.document.update(response.content);
        }
    },

    add_hooks: function() {
        var self = this;
        this.document.forms.forEach(function(f) {
            self.event_handlers.push(event.connect(f, 'onsubmit', getattr(self, '_process_from_forms')));
        });
        this.document.links.forEach(function(l) {
            self.event_handlers.push(event.connect(l, 'onclick', getattr(self, '_process_from_links')));
        });
    },

    remove_hooks: function() {
        this.event_handlers.forEach(function(hler) {
            event.disconnect(hler);
        });
    },

    _state_to_path: function(state) {
        var path = state;
        if (!path.startswith('/'))
            path = '/' + path;
        if (!path.endswith('/'))
            path = path + '/';
        return path;
    },

    _path_to_state: function(path) {
        var state = path;
        if (state.startswith('/'))
            state = state.slice(1);
        if (state.endswith('/'))
            state = state.slice(0, -1);;
        return state;
    },

    _build_request: function(url) {
        if (http.absolute_http_url_re.test(url))
            return new http.HttpRequest(url);
        if (url.startswith('/'))
            return new http.HttpRequest(url);
        else {
            var path = this._state_to_path(this.history.current_state);
            path = path + url;
            return new http.HttpRequest(path);
        }
    },

    _process_request: function(request) {
        //Te queres ir?
        if (!request.is_valid()) return;
        if (!request.is_same_origin())
            window.location = request.source;
        this.history.navigate(this._path_to_state(request.path), request);
        this.send(request);
    }, 

    _process_from_forms: function(e) {
        event.stopEvent(e);
        var element = e.target;
        var request = this._build_request(element.getAttribute('action'));
        request.method = element.method;
        request[element.method] = element.serialize();
        this._process_request(request);
    },

    _process_from_links: function(e) {
        event.stopEvent(e);
        var element = e.target;
        var request = this._build_request(element.getAttribute('href'));
        request.method = 'get';
        this._process_request(request);
    },
    
    _process_from_string: function(s) {
        var request = this._build_request(s);
        request.method = 'get';
        this._process_request(request);
    },

    _process_from_history: function(request) {
        this.send(request);
    },

    set location(value) {
        this._process_from_string(value);
    }
});

publish({
    DOMAdapter: DOMAdapter
});

/*
// Configuration for urlize() function.
var LEADING_PUNCTUATION  = ['(', '<', '&lt;'];
var TRAILING_PUNCTUATION = ['.', ',', ')', '>', '\n', '&gt;'];

// List of possible strings used for bullets in bulleted lists.
var DOTS = ['&middot;', '*', '\xe2\x80\xa2', '&//149;', '&bull;', '&//8226;'];

var unencoded_ampersands_re = re.compile(r'&(?!(\w+|//\d+);)');
var word_split_re = re.compile(r'(\s+)');
var punctuation_re = re.compile('^(?P<lead>(?:%s)*)(?P<middle>.*?)(?P<trail>(?:%s)*)$' % \
    ('|'.join([re.escape(x) for x in LEADING_PUNCTUATION]),
    '|'.join([re.escape(x) for x in TRAILING_PUNCTUATION])))
var simple_email_re = re.compile(r'^\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$')
var link_target_attribute_re = re.compile(r'(<a [^>]*?)target=[^\s>]+')
var html_gunk_re = re.compile(r'(?:<br clear="all">|<i><\/i>|<b><\/b>|<em><\/em>|<strong><\/strong>|<\/?smallcaps>|<\/?uppercase>)', re.IGNORECASE)
var hard_coded_bullets_re = re.compile(r'((?:<p>(?:%s).*?[a-zA-Z].*?</p>\s*)+)' % '|'.join([re.escape(x) for x in DOTS]), re.DOTALL)
var trailing_empty_content_re = re.compile(r'(?:<p>(?:&nbsp;|\s|<br \/>)*?</p>\s*)+\Z')
delete x // Temporary variable

def escape(html):
    """Returns the given HTML with ampersands, quotes and carets encoded."""
    return mark_safe(force_unicode(html).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&//39;'))
escape = allow_lazy(escape, unicode)

def conditional_escape(html):
    """
    Similar to escape(), except that it doesn't operate on pre-escaped strings.
    """
    if isinstance(html, SafeData):
        return html
    else:
        return escape(html)

def linebreaks(value, autoescape=False):
    """Converts newlines into <p> and <br />s."""
    value = re.sub(r'\r\n|\r|\n', '\n', force_unicode(value)) // normalize newlines
    paras = re.split('\n{2,}', value)
    if autoescape:
        paras = [u'<p>%s</p>' % escape(p.strip()).replace('\n', '<br />') for p in paras]
    else:
        paras = [u'<p>%s</p>' % p.strip().replace('\n', '<br />') for p in paras]
    return u'\n\n'.join(paras)
linebreaks = allow_lazy(linebreaks, unicode)

def strip_tags(value):
    """Returns the given HTML with all tags stripped."""
    return re.sub(r'<[^>]*?>', '', force_unicode(value))
strip_tags = allow_lazy(strip_tags)

def strip_spaces_between_tags(value):
    """Returns the given HTML with spaces between tags removed."""
    return re.sub(r'>\s+<', '><', force_unicode(value))
strip_spaces_between_tags = allow_lazy(strip_spaces_between_tags, unicode)

def strip_entities(value):
    """Returns the given HTML with all entities (&something;) stripped."""
    return re.sub(r'&(?:\w+|//\d+);', '', force_unicode(value))
strip_entities = allow_lazy(strip_entities, unicode)

def fix_ampersands(value):
    """Returns the given HTML with all unencoded ampersands encoded correctly."""
    return unencoded_ampersands_re.sub('&amp;', force_unicode(value))
fix_ampersands = allow_lazy(fix_ampersands, unicode)

def urlize(text, trim_url_limit=None, nofollow=False, autoescape=False):
    """
    Converts any URLs in text into clickable links.

    Works on http://, https://, www. links and links ending in .org, .net or
    .com. Links can have trailing punctuation (periods, commas, close-parens)
    and leading punctuation (opening parens) and it'll still do the right
    thing.

    If trim_url_limit is not None, the URLs in link text longer than this limit
    will truncated to trim_url_limit-3 characters and appended with an elipsis.

    If nofollow is True, the URLs in link text will get a rel="nofollow"
    attribute.

    If autoescape is True, the link text and URLs will get autoescaped.
    """
    trim_url = lambda x, limit=trim_url_limit: limit is not None and (len(x) > limit and ('%s...' % x[:max(0, limit - 3)])) or x
    safe_input = isinstance(text, SafeData)
    words = word_split_re.split(force_unicode(text))
    nofollow_attr = nofollow and ' rel="nofollow"' or ''
    for i, word in enumerate(words):
        match = None
        if '.' in word or '@' in word or ':' in word:
            match = punctuation_re.match(word)
        if match:
            lead, middle, trail = match.groups()
            // Make URL we want to point to.
            url = None
            if middle.startswith('http://') or middle.startswith('https://'):
                url = urlquote(middle, safe='/&=:;//?+*')
            elif middle.startswith('www.') or ('@' not in middle and \
                    middle and middle[0] in string.ascii_letters + string.digits and \
                    (middle.endswith('.org') or middle.endswith('.net') or middle.endswith('.com'))):
                url = urlquote('http://%s' % middle, safe='/&=:;//?+*')
            elif '@' in middle and not ':' in middle and simple_email_re.match(middle):
                url = 'mailto:%s' % middle
                nofollow_attr = ''
            // Make link.
            if url:
                trimmed = trim_url(middle)
                if autoescape and not safe_input:
                    lead, trail = escape(lead), escape(trail)
                    url, trimmed = escape(url), escape(trimmed)
                middle = '<a href="%s"%s>%s</a>' % (url, nofollow_attr, trimmed)
                words[i] = mark_safe('%s%s%s' % (lead, middle, trail))
            else:
                if safe_input:
                    words[i] = mark_safe(word)
                elif autoescape:
                    words[i] = escape(word)
        elif safe_input:
            words[i] = mark_safe(word)
        elif autoescape:
            words[i] = escape(word)
    return u''.join(words)
urlize = allow_lazy(urlize, unicode)

def clean_html(text):
    """
    Clean the given HTML.  Specifically, do the following:
        * Convert <b> and <i> to <strong> and <em>.
        * Encode all ampersands correctly.
        * Remove all "target" attributes from <a> tags.
        * Remove extraneous HTML, such as presentational tags that open and
          immediately close and <br clear="all">.
        * Convert hard-coded bullets into HTML unordered lists.
        * Remove stuff like "<p>&nbsp;&nbsp;</p>", but only if it's at the
          bottom of the text.
    """
    from django.utils.text import normalize_newlines
    text = normalize_newlines(force_unicode(text))
    text = re.sub(r'<(/?)\s*b\s*>', '<\\1strong>', text)
    text = re.sub(r'<(/?)\s*i\s*>', '<\\1em>', text)
    text = fix_ampersands(text)
    // Remove all target="" attributes from <a> tags.
    text = link_target_attribute_re.sub('\\1', text)
    // Trim stupid HTML such as <br clear="all">.
    text = html_gunk_re.sub('', text)
    // Convert hard-coded bullets into HTML unordered lists.
    def replace_p_tags(match):
        s = match.group().replace('</p>', '</li>')
        for d in DOTS:
            s = s.replace('<p>%s' % d, '<li>')
        return u'<ul>\n%s\n</ul>' % s
    text = hard_coded_bullets_re.sub(replace_p_tags, text)
    // Remove stuff like "<p>&nbsp;&nbsp;</p>", but only if it's at the bottom
    // of the text.
    text = trailing_empty_content_re.sub('', text)
    return text
clean_html = allow_lazy(clean_html, unicode)
*/