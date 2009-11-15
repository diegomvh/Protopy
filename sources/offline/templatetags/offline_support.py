from django import template
from offline import util

register = template.Library()

def offline():
    return False

register.simple_tag(offline)

def protopy_js():
    from offline import sites
    assert sites.REMOTE_SITES, "No remote sites defined for this project"
    a_site = sites.REMOTE_SITES.values()[0]
    return '<script type="text/javascript;version=1.7" src="%s/protopy.js"></script>' % a_site.lib_url

register.simple_tag(protopy_js)

def offline_detect(remote_site):
    from offline.util import get_site
    a_site = get_site(remote_site)
    assert(a_site != None, "No remote site named: " % a_site)
    return '''<script type="text/javascript;version=1.7">
            require('doff.contrib.offline.online');
            alert('%s');
        </script>''' % a_site.url

register.simple_tag(offline_detect)