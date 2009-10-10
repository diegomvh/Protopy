from django import template
from offline import util

register = template.Library()



def protopy_js_include():
    from offline import sites
    from urllib2 import urlparse
    assert sites.REMOTE_SITES, "No remote sites defined for this project"
    a_site = sites.REMOTE_SITES.values()[0]
    #path = urlparse.urljoin(a_site.js_url, 'lib', 'protopy.js')
    return '<script type="text/javascript;version=1.7" src="%s/../lib/protopy.js"></script>' % a_site.js_url

register.simple_tag(protopy_js_include)