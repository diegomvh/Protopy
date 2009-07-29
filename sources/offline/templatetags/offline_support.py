from django import template
from offline import util

register = template.Library()

offline_template = '''
<script type="text/javascript;version=1.7" src="%(lib_url)s/protopy.js"></script>
<script type="text/javascript;version=1.7">
    require('doff.core.project', 'new_project');
    var %(name)s = new_project('%(name)s', '%(url)s');
    %(name)s.bootstrap();
</script>
'''
import ipdb
def offline(name):
    site = util.get_site(name)
    data = {'lib_url': site.lib_url, 'name': site.name, 'url': site.url}
    return offline_template % data

register.simple_tag(offline)