#!/usr/bin/env python

from IPython.core.getipython import get_ipython
from IPython.display import display

import uuid
from copy import deepcopy
from functools import partial

ip = get_ipython()
session = ip.kernel.session
sock = ip.display_pub.pub_socket

_live_cbs = {}

def send_update(id, value, raw=False):
  if not raw:
    value, _ = ip.display_formatter.format(value)
  ip.kernel.session.send(sock, 'live_update', value, {
    'msg_id': id,
    'unique': uuid.uuid4().hex,
  })

def onupdate(_a, _b, data):
  content = data['content']
  id = data['parent_header']['msg_id']
  args = content['args']
  if id in _live_cbs:
    _live_cbs[id](*args)
  else:
    print 'FAILed to find an update listener'

ip.kernel.shell_handlers['live_update'] = onupdate

class Live(object):

    def __init__(self, initial, onup=None, raw=False):
        self.id = uuid.uuid4().hex

        self.value = initial
        self.raw = raw

        if onup:
            _live_cbs[self.id] = partial(onup, self.update)

    def update(self, value, raw=False):
        self.value = value
        send_update(self.id, value, raw)

    def _repr_live_(self):
        value = self.value if self.raw else ip.display_formatter.format(self.value)[0]
        return {'id': self.id,
                'value': value}



from IPython.core.formatters import BaseFormatter, FormatterABC, Unicode, ObjectName

class LiveFormatter(BaseFormatter):
    """A LiveElement formatter.

    To define the callables that compute the Javascript representation of
    your objects, define a :meth:`_repr_live_` method or use the
    :meth:`for_type` or :meth:`for_type_by_name` methods to register functions
    that handle this.

    The return value of this formatter should be a formatted JSON object
    """
    format_type = Unicode('json/live')
    _return_type = (dict,)

    print_method = ObjectName('_repr_live_')

FormatterABC.register(LiveFormatter)

from IPython import get_ipython
ip = get_ipython()
display = ip.display_formatter
formatter = LiveFormatter(parent=display)
display.formatters['json/live'] = formatter

# vim: et sw=4 sts=4
