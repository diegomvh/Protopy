from django import template
from offline import util

register = template.Library()

offline_template = '''
<script type="text/javascript;version=1.7" src="%(lib_url)s/protopy.js"></script>
<script type="text/javascript;version=1.7">
    require('doff.core.project', 'new_project');
    var %(name)s = new_project('%(name)s', '%(js_url)s');
    %(name)s.bootstrap();
</script>
'''

def offline(name):
    site = util.get_site(name)
    return offline_template % site.__dict__

register.simple_tag(offline)