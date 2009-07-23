from django import template
from offline.util import get_site

register = template.Library()

offline_template = '''
<script type="text/javascript;version=1.7" src="/%(OFFLINE_SUPPORT)s/system/protopy.js"></script>
<script type="text/javascript;version=1.7">
    require('doff.core.project', 'new_project');
    var %(PROJECT_PACKAGE)s = new_project('%(PROJECT_PACKAGE)s', '/%(OFFLINE_SUPPORT)s');
    %(PROJECT_PACKAGE)s.bootstrap();
</script>
'''

def offline(name):
    site = get_site(name)
    return offline_template % { 'OFFLINE_SUPPORT': site.offline_base, 
                                'PROJECT_PACKAGE': site.name
                              }

register.simple_tag(offline)