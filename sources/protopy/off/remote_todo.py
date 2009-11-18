# -*- coding: utf-8 -*-
from offline.sites import RemoteSite 

class TodoRemoteSite(RemoteSite):
    exclude_patterns = (r'.*~$', )

site = TodoRemoteSite('todo')