#!/usr/bin/env python

from IPython import get_ipython
ip = get_ipython()

from IPython.core.interactiveshell import InteractiveShell
from IPython.utils.jsonutil import encode_images

def format(value):
    format = InteractiveShell.instance().display_formatter.format
    return encode_images(format(value)[0])

class Table(object):
    def __init__(self, headers, rows=None):
        if rows is None:
            rows = headers
            headers = None
        self.headers = headers
        self.rows = rows

    def _repr_table_(self):
        return {
            'headers': map(format, self.headers) if self.headers else None,
            'rows': [map(format, row) for row in self.rows]
        }

from IPython.core.formatters import (
        BaseFormatter, FormatterABC, Unicode, ObjectName)

class TableFormatter(BaseFormatter):
    """A Table formatter.

    To define the callables that compute the Javascript representation of
    your objects, define a :meth:`_repr_table_` method or use the
    :meth:`for_type` or :meth:`for_type_by_name` methods to register functions
    that handle this.

    The return value of this formatter should be a {header: [], rows: []}.
    Everything will be fed through `ipython display`.
    """
    format_type = Unicode('json/table')
    _return_type = (dict,)

    print_method = ObjectName('_repr_table_')

FormatterABC.register(TableFormatter)

display = ip.display_formatter
formatter = TableFormatter(parent=display)
display.formatters['json/table'] = formatter


# vim: et sw=4 sts=4
