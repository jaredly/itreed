#!/usr/bin/env python

from IPython.core.formatters import BaseFormatter, FormatterABC, Unicode, ObjectName


class VegaFormatter(BaseFormatter):
    """A Vega formatter.

    To define the callables that compute the Javascript representation of
    your objects, define a :meth:`_repr_vega_` method or use the
    :meth:`for_type` or :meth:`for_type_by_name` methods to register functions
    that handle this.

    The return value of this formatter should be valid Vega JSON.
    """
    format_type = Unicode('json/vega')

    print_method = ObjectName('_repr_vega_')

FormatterABC.register(VegaFormatter)

from IPython import get_ipython
ip = get_ipython()
display = ip.display_formatter
formatter = VegaFormatter(parent=display)
display.formatters['json/vega'] = formatter

# vim: et sw=4 sts=4
