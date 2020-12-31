#!/usr/bin/env python3

# Google Test Pretty Printer
# https://github.com/joshkel/gtpp


# Google Test Pretty Printer
# https://github.com/joshkel/gtpp

import argparse
from collections import OrderedDict
import colorama
from colorama import Fore, Style
from functools import wraps
import os
import re
import shutil
import signal
import subprocess
import sys

# Source: http://stackoverflow.com/a/2549950/25507
signal_names = dict((k, v) for v, k in reversed(sorted(signal.__dict__.items()))
                    if v.startswith('SIG') and not v.startswith('SIG_'))


class UnicodeCharacters:
    width = 1

    empty = ' '
    success = '✓'
    fail = '✗'
    busy = '…'


class AsciiCharacters:
    width = 2

    empty = '  '
    success = 'OK'
    fail = ' X'
    busy = '..'


def plural(text, count):
    return text if count == 1 else text + 's'


class LineHandler(object):
    """Offers decorators for setting up regex-based parsing of line input."""

    def __init__(self):
        self._handlers = []

    def process(self, owner, line):
        for h in self._handlers:
            if h(owner, line):
                return True

    def add(self, regex):
        if isinstance(regex, str):
            regex = re.compile(regex)

        def decorator(f):
            @wraps(f)
            def wrapper(self, line):
                m = regex.search(line)
                if not m:
                    return False
                result = f(self, *m.groups())
                if result is not None:
                    return result
                else:
                    return True

            self._handlers.append(wrapper)

            return wrapper

        return decorator


class Parser(object):
    """Parses Google Test output.

    Parsed output is used to generate test events, which are dispatched to our
    own Output class."""

    TIME_RE = r'(?: \((\d+) ms(?: total)?\))?'

    handler = LineHandler()

    def __init__(self, output):
        self.output = output

        self.total_test_count = 0
        self.total_test_case_count = 0
        self.test_case_index = 0

        self.current_test_case = None
        self.current_test_count = 0
        self.current_test = None
        self.test_index = 0
        self.current_fail_count = 0

        self.is_summarizing_failures = None

        # Public properties
        self.in_test_suite = False
        self.has_failures = False    # Has any test ever failed?

    def process(self, line):
        if not self.handler.process(self, line):
            self.output.raw_output(self.current_test, line)

    @staticmethod
    def parse_time(time):
        if time is not None:
            return int(time)
        else:
            return None

    @handler.add(r'Running (\d+) tests? from (\d+) test cases?')
    def start(self, total_test_count, total_test_case_count):
        self.total_test_count = int(total_test_count)
        self.total_test_case_count = int(total_test_case_count)
        self.in_test_suite = True
        self.is_summarizing_failures = False

    @handler.add(r'(\d+) tests? from (\d+) test cases? ran. ?' + TIME_RE + '$')
    def finish(self, total_test_count, total_test_case_count, time):
        self.output.finish(int(total_test_count), int(
            total_test_case_count), self.parse_time(time))
        self.in_test_suite = False

    @handler.add(r'\[ *PASSED *\] (\d+) tests?')
    def summary_passed(self, passed_test_count):
        pass

    @handler.add(r'\[ *FAILED *\] (\d+) tests?, listed below')
    def summary_failed1(self, failed_test_count):
        self.is_summarizing_failures = True
        pass

    @handler.add(r'(\d+) FAILED TESTS?')
    def summary_failed2(self, failed_test_count):
        pass

    @handler.add(r'YOU HAVE (\d+) DISABLED TESTS?')
    def summary_disabled(self, disabled_test_count):
        self.output.disabled(int(disabled_test_count))

    @handler.add(r'\[-+\] (\d+) tests? from (.*?)(?:, where (.*?))?' + TIME_RE + '$')
    def start_stop_test_case(self, test_count, test_case, where=None, time=None):
        self.current_test = None
        if not self.current_test_case:
            self.current_test_case = test_case
            self.current_test_count = int(test_count)
            self.current_fail_count = 0
            self.test_index = 0
            self.test_case_index += 1

            self.output.start_test_case(
                test_case, self.test_case_index, self.total_test_case_count, where)
        else:
            self.output.stop_test_case(
                test_case, self.test_case_index, self.total_test_case_count,
                self.current_test_count, self.current_fail_count, self.parse_time(time))
            self.current_test_case = None

    @handler.add(r'\[ *RUN *\] (.*)\.(.*)')
    def start_test(self, test_case, test):
        self.current_test = None
        self.test_index += 1
        self.output.start_test(
            test_case, test, self.test_index, self.current_test_count)

    @handler.add(r'\[ *(OK|FAILED) *\] (.*)\.(.*?)' + TIME_RE + '$')
    def stop_test(self, status, test_case, test, time=None):
        if self.is_summarizing_failures:
            return

        self.current_test = None
        if status == 'FAILED':
            self.current_fail_count += 1
            self.has_failures = True
        self.output.stop_test(
            status, test_case, test, self.test_index, self.current_test_count,
            self.parse_time(time))

    @handler.add(r'Global test environment set-up')
    def global_setup(self):
        self.output.global_setup(
            self.total_test_count, self.total_test_case_count)

    @handler.add(r'Global test environment tear-down')
    def global_teardown(self):
        self.output.global_teardown()

    @handler.add(r'Note: Google Test filter = (.*)')
    def filter(self, filter):
        self.output.filter(filter)

    @handler.add(r'^$')
    def blank_line(self):
        if self.current_test_case:
            # Within a test, return False so it's treated as raw output.
            return False


class LinePrinter(object):
    def __init__(self):
        self.prev_line_len = 0
        self.needs_newline = False

    def print_noeol(self, line):
        if self.needs_newline:
            print('\r', end='')
        else:
            self.prev_line_len = 0

        line_no_ansi = re.sub('\x1b\\[\\d+m', '', line)
        line_len = len(line_no_ansi)
        if self.prev_line_len > line_len:
            line = line + ' ' * (self.prev_line_len - line_len)

        print(line, end='')
        self.needs_newline = True
        self.prev_line_len = line_len

    def print(self, line=''):
        if self.needs_newline:
            self.newline()

        # Our lines are piped from Google Test and typically have their own
        # newline.  To allow both those and normal Python usage, remove any
        # newlines then add our own.
        print(line.rstrip('\n'))

    def newline(self):
        print()
        self.prev_line_len = 0
        self.needs_newline = False


class BaseOutput(object):
    def __init__(self, characters=UnicodeCharacters, print_time=0):
        self.characters = characters
        self.print_time = print_time

        self.printer = LinePrinter()

        self.is_filtered = False

    def format_failed(self, fail_count, test_count, test_case_count):
        """Helper method: Formats final results if there are any failures."""
        tests = plural('test', test_count)
        test_cases = plural('test case', test_case_count)
        return ('%i/%i %s from %i %s failed'
                % (fail_count, test_count, tests, test_case_count, test_cases))

    def format_passed(self, test_count, test_case_count):
        """Helper method: Formats final results if everything passed."""
        tests = plural('test', test_count)
        test_cases = plural('test case', test_case_count)
        return ('%i/%i %s from %i %s passed'
                % (test_count, test_count, tests, test_case_count, test_cases))

    def format_time(self, time):
        """Helper method: Formats a time in msec for display."""
        if time is not None and time >= self.print_time:
            return ' (%s ms)' % time
        else:
            return ''

    def filter(self, filter):
        # Duplicate message from native Google Test
        self.printer.print(Fore.YELLOW + 'Note: Google Test filter = %s' % filter + Style.RESET_ALL)
        self.is_filtered = True

    def disabled(self, disabled_test_count):
        # Duplicate message from native Google Test
        message = ('YOU HAVE %i DISABLED %s'
                   % (disabled_test_count, plural('test', disabled_test_count).upper()))
        self.printer.print(Fore.YELLOW + message + Style.RESET_ALL)

    def raw_output(self, test, line):
        raise NotImplementedError

    def start_test_case(self, test_case, test_case_index, total_test_case_count, where=None):

        raise NotImplementedError

    def stop_test_case(self, test_case, test_case_index, total_test_case_count,
                       test_count, fail_count, time=None):
        raise NotImplementedError

    def start_test(self, test_case, test, test_index, test_count):
        raise NotImplementedError

    def stop_test(self, status, test_case, test, test_index, test_count, time=None):
        raise NotImplementedError

    def global_setup(self, total_test_count, total_test_case_count):
        raise NotImplementedError

    def global_teardown(self):
        raise NotImplementedError

    def finish(self, total_test_count, total_test_case_count, time):
        raise NotImplementedError


class ListOutput(BaseOutput):
    """Standard test output.

    Lists test cases, with more detail for failed tests."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Internal state
        self.current_test_case_has_output = False
        self.progress_len = 0

        self.current_test_output = []
        self.failed_test_output = OrderedDict()

        # Test progress - provided to start_test_case and stored for use in
        # start_test
        self.test_case_index = None
        self.total_test_case_count = None

    def progress(self, current, total):
        total = str(total)
        return '%*i / ' % (len(total), current) + total

    def space_for_progress(self, current, total, char=' '):
        return char * len(self.progress(current, total))

    def progress_counts(self):
        # Print the count if this is still the first line of the test case.
        # If any raw output (including test failure messages) has occurred,
        # then it's not.
        if self.current_test_case_has_output:
            return None, None
        else:
            return self.test_case_index, self.total_test_case_count

    def print_status(self, test_case, test_case_index, total_test_case_count, character,
                     color=None, details=None, force_progress=False, progress_space=' '):
        """Implementation: Prints a line of test / test case progress."""
        if test_case_index is None:
            line = progress_space * self.progress_len
        elif self.printer.needs_newline or force_progress:
            line = self.progress(test_case_index, total_test_case_count)
            self.progress_len = len(line)
        else:
            line = self.space_for_progress(
                test_case_index, total_test_case_count)
            self.progress_len = len(line)

        if color:
            line += color
        line += ' ' + character + ' ' + test_case
        if color:
            line += Style.RESET_ALL
        if details:
            line += details

        self.printer.print_noeol(line)

    def raw_output(self, test, line):
        self.current_test_case_has_output = True
        self.printer.print(line)
        self.current_test_output.append(line)

    def start_test_case(self, test_case, test_case_index, total_test_case_count, where=None):
        self.print_status(test_case, test_case_index, total_test_case_count,
                          self.characters.empty, Fore.CYAN, force_progress=True)

        self.test_case_index = test_case_index
        self.total_test_case_count = total_test_case_count
        self.current_test_case_has_output = False

    def stop_test_case(self, test_case, test_case_index, total_test_case_count,
                       test_count, fail_count, time=None):
        time_details = self.format_time(time)
        if not fail_count:
            self.print_status(test_case, test_case_index, total_test_case_count,
                              self.characters.success, Fore.GREEN, details=time_details)
        else:
            self.print_status(test_case, test_case_index, total_test_case_count,
                              self.characters.fail, Fore.RED,
                              ' - %i/%i failed%s' % (fail_count, test_count, time_details))

        self.printer.newline()

    def start_test(self, test_case, test, test_index, test_count):
        test_case_index, total_test_case_count = self.progress_counts()

        self.print_status(test_case + '.' + test, test_case_index, total_test_case_count,
                          self.characters.empty, Fore.CYAN)

        self.current_test_output = []

    def stop_test(self, status, test_case, test, test_index, test_count, time=None):
        if status != 'FAILED' and not self.is_filtered:
            # If filtering is active, be verbose.
            return

        test_case_index, total_test_case_count = self.progress_counts()

        if status == 'FAILED':
            self.print_status(test_case + '.' + test, test_case_index, total_test_case_count,
                              self.characters.fail, Fore.RED)
            self.failed_test_output[test_case +
                                    '.' + test] = self.current_test_output
        else:
            self.print_status(test_case + '.' + test, test_case_index, total_test_case_count,
                              self.characters.success, Fore.GREEN)

        self.printer.newline()
        self.current_test_case_has_output = True

    def global_setup(self, total_test_count, total_test_case_count):
        self.total_total_test_case_count = total_test_case_count
        self.print_status('Setup', None, None, self.characters.empty)

    def global_teardown(self):
        self.print_status('Teardown', None, None, self.characters.empty)

    def finish(self, total_test_count, total_test_case_count, time):
        time_details = self.format_time(time)
        if not self.failed_test_output:
            passed_details = ' - ' + \
                self.format_passed(total_test_count, total_test_case_count)
            self.print_status('Finished', None, None, self.characters.success, Fore.GREEN,
                              details=passed_details + time_details, progress_space='-')
        else:
            failed_details = ' - ' + self.format_failed(
                len(self.failed_test_output), total_test_count, total_test_case_count)
            self.print_status('Finished', None, None, self.characters.fail, Fore.RED,
                              details=failed_details + time_details, progress_space='-')
        self.printer.newline()

        if self.failed_test_output:
            self.printer.print()
            self.printer.print(Fore.RED + 'FAILED TESTS:' + Style.RESET_ALL)
            for test_and_case, output in self.failed_test_output.items():
                self.printer.print(
                    Fore.RED + self.characters.fail + ' ' + test_and_case + Style.RESET_ALL)
                for line in output:
                    self.printer.print('    ' + line)


class FailuresOnlyOutput(BaseOutput):
    PERCENT_WIDTH = 5

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        columns = shutil.get_terminal_size().columns
        self.max_test_name_len = columns - self.PERCENT_WIDTH - 4 - self.characters.width

        self.current_test_has_output = False
        self.total_test_count = 0
        self.total_test_index = 0
        self.failed_test_count = 0

    def format_percent(self):
        return ''
        # '%*.1f%%' % (self.PERCENT_WIDTH, self.total_test_index / self.total_test_count * 100)

    def print_status(self, test_and_case, character=None, color=Fore.CYAN, include_percent=True):
        line = color
        if character:
            line += character + ' '
        else:
            line += ' ' * (self.characters.width + 1)

        line += '%*.*s' % (-self.max_test_name_len,
                           self.max_test_name_len, test_and_case)

        if include_percent:
            line += self.format_percent()

        line += Style.RESET_ALL

        self.printer.print_noeol(line)

    def raw_output(self, test, line):
        self.printer.print(' ' * 2 + line)
        self.current_test_has_output = True

    def start_test_case(self, test_case, test_case_index, total_test_case_count, where=None):

        pass

    def stop_test_case(self, test_case, test_case_index, total_test_case_count,
                       test_count, fail_count, time=None):
        pass

    def start_test(self, test_case, test, test_index, test_count):
        self.total_test_index += 1
        self.print_status(test_case + '.' + test, self.characters.busy)

    def stop_test(self, status, test_case, test, test_index, test_count, time=None):
        if self.current_test_has_output or self.is_filtered or status == 'FAILED':
            if status == 'FAILED':
                self.failed_test_count += 1
                self.print_status(test_case + '.' + test,
                                  self.characters.fail, Fore.RED, False)
            else:
                self.print_status(test_case + '.' + test,
                                  self.characters.success, Fore.GREEN, False)
            self.printer.newline()
        self.current_test_has_output = False

    def global_setup(self, total_test_count, total_test_case_count):
        self.total_test_count = total_test_count
        self.total_test_index = 0
        self.failed_test_count = 0
        self.print_status('Setup')

    def global_teardown(self):
        self.print_status('Teardown')

    def finish(self, total_test_count, total_test_case_count, time):
        time_details = self.format_time(time)
        if not self.failed_test_count:
            status_details = self.format_passed(
                total_test_count, total_test_case_count)
            color = Fore.GREEN
            character = self.characters.success
        else:
            status_details = self.format_failed(
                self.failed_test_count, total_test_count, total_test_case_count)
            color = Fore.RED
            character = self.characters.fail
        self.printer.print_noeol(
            color + character + ' ' + status_details + Style.RESET_ALL + time_details)
        self.printer.newline()


def parse_command_line():
    argparser = argparse.ArgumentParser()
    argparser.add_argument('--failures-only', action='store_true',
                           help='Only failed tests (and other test output) are left on screen')
    argparser.add_argument('--ascii', action='store_true',
                           help='Use ASCII progress / status, not Unicode')
    argparser.add_argument('--print-time', type=int, default=50,
                           help='Only print times that are at least N milliseconds')
    argparser.add_argument('command', nargs=argparse.REMAINDER)
    args = argparser.parse_args()

    kwargs = {}
    if args.ascii:
        kwargs['characters'] = AsciiCharacters
    kwargs['print_time'] = args.print_time

    output = ListOutput
    if args.failures_only:
        output = FailuresOnlyOutput

    return args.command, output(**kwargs)


def print_exit_status(process, printer):
    exit_signal = None
    exit_code = None
    core_dumped = False

    try:
        wait_result = os.waitpid(process.pid, 0)[1]
        if os.WIFSIGNALED(wait_result):
            exit_signal = os.WTERMSIG(wait_result)
            exit_code = 128 + exit_signal
        elif os.WIFEXITED(wait_result):
            exit_code = os.WEXITSTATUS(wait_result)
        core_dumped = os.WCOREDUMP(wait_result)
    except ChildProcessError:
        # Must be Windows; waiting for a terminated process doesn't work (?)
        exit_code = process.returncode

    if exit_signal is not None:
        signal_name = signal_names.get(exit_signal, 'unknown signal')
        printer.print(
            Fore.RED + 'Terminated by %s (%i)' % (signal_name, exit_signal) + Style.RESET_ALL)
        exit_code = 128 + exit_signal
    if core_dumped:
        printer.print(Fore.RED + 'Core dumped' + Style.RESET_ALL)
    return exit_code


def pipe_as_text(input):
    for line in input:
        line = line.decode('utf')

        # Normalize binary-mode Windows line endings
        if line.endswith('\r\n'):
            line = line[:-2] + '\n'

        yield line


def main():
    colorama.init()
    command, output = parse_command_line()
    parser = Parser(output)

    if command:
        try:
            test_process = subprocess.Popen(
                command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        except Exception as e:
            print(e)
            sys.exit(1)
        test_output = test_process.stdout
        filter = pipe_as_text
    else:
        test_process = None
        test_output = sys.stdin

        def filter(x): return x

    for line in filter(test_output):
        parser.process(line)

    exit_code = None
    if test_process:
        exit_code = print_exit_status(test_process, output.printer)
    if parser.in_test_suite:
        output.printer.print(Fore.RED + 'Test suite aborted' + Style.RESET_ALL)
        sys.exit(exit_code or 1)
    elif parser.has_failures:
        sys.exit(exit_code or 1)
    else:
        sys.exit(exit_code or 0)


if __name__ == '__main__':
    main()
