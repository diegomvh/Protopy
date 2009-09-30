/* 'HTML utilities suitable for global use.' */
require('dom');
require('event');
require('ajax');
require('doff.utils.http');
//http://www.contentwithstyle.co.uk/content/fixing-the-back-button-and-enabling-bookmarking-for-ajax-apps

var History = type('History', [ object ], {
    __init__: function() {
        this.state = document.createElement('input');
        this.state.id = "history";
        this.state.hide();
        $$('body')[0].insert(this.state);
        this.states = [];
        this.hash = this.get_hash();
        this.counter = 0;
        this.thread = window.setInterval(getattr(this, 'check_hash'), 50);
    },

    onChange: function(request) {},

    check_hash: function() {
        if (this.path !== this.current_path) {
            this.current_path = this.path;
            var request = this.states[this.entry];
            this.onChange(this.states[this.entry]);
        }
    },

    get_hash: function() {
        var hash = location.hash;
        return hash.substr(1);
    },

    get entry(){
        return Number(ajax.toQueryParams(this.get_hash())['entry']);
    },
    
    get path(){
        return ajax.toQueryParams(this.get_hash())['path'];
    },

    navigate: function(request) {
        this.states = this.states.slice(0, this.entry);
        this.states.push(request);
        this.current_path = request.path;
        location.hash = 'entry=' + len(this.states) + '&path=' + request.path;
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
        this.forms = this.body.select('FORMS');
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
        event.connect(this.history, 'onChange', this, 'process_request');
    },

    send: function(request) {},

    receive: function(response) {
        if (response.status_code == 200) {
            this.remove_hooks();
            this.document.update(response.content);
            this.add_hooks();
        } else if (response.status_code == 302) {
            return this.handle(response['Location']);
        } else if (response.status_code == 404) {
            //Agregar a las url no manjeadas
            //value.setOpacity(0.2);
            return this.document.update(response.content);
        }
    },

    process_request: function(request) {
        //Te queres ir?
        if (!request.is_same_origin())
            window.location = request.source;
        if (request.relative.startswith(this._location.pathname))
            request.fix_location(this._location.pathname, this.history.get_hash());
        //hace falta mandarlo?
        if (this.history.path !== request.path ) {
            this.send(request);
            this.history.navigate(request);
        }
    }, 

    set location(value) {
        var request = new http.HttpRequest(value);
        this.process_request(request);
    },

    add_hooks: function() {
        var self = this;
        this.document.forms.forEach(function(f) {
            self.event_handlers.push(event.connect(f, 'onsubmit', getattr(self, '_forms')));
        });
        this.document.links.forEach(function(l) {
            self.event_handlers.push(event.connect(l, 'onclick', getattr(self, '_links')));
        });
    },

    remove_hooks: function() {
        this.event_handlers.forEach(function(hler) {
            event.disconnect(hler);
        });
    },

    _forms: function(e) {
        event.stopEvent(e);
        var element = e.target;
        var request = new http.HttpRequest(element.action);
        request.method = element.method;
        request[element.method] = element.serialize();
        this.process_request(request);
    },

    _links: function(e) {
        event.stopEvent(e);
        var element = e.target;
        var request = new http.HttpRequest(element.href);
        request.method = 'get';
        this.process_request(request);
    }
});

/*
window.location.watch('hash', function(id, oldval, newval) {
    console.log('Old: ', oldval);
    console.log('New: ', newval);
    return newval;
});
*/
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