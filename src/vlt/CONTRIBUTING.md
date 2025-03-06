# `vlt` CLI Development

(Or: "What goes in this workspace?")

There is always a tendency, when adding features to a CLI project, to
say, "This is just a small little feature, I'll just put it in here
for now while we figure out how it works".

This is an ok impulse! Sometimes an experiment is just easiest to do
in one place!

But it must come along with ruthless repeated refactoring. Whenever
possible, certainly before considering a feature "done", create a new
workspace or add the functionality to an existing `@vltpkg/*` library
in this project.

_Only_ the following sorts of functionality belong here in the cli
project directly:

- Configuration definitions and loading logic. (This is kind of a
  stretch, but it's always annoying to _not_ have config definition
  live with argument parsing.)
- Argument parsing (ie, turning "stuff a user typed" into "list of
  things to do").
- Minimal command functions that pass user arguments to
  library-provided implementation methods.
- View implementations that take the result of an action and present
  it in various ways.
- Ergonomic presentations of various common error messages.

In software design pattern terms, this is a "View Controller". It
parses the user's intent, passes functionality off to some other
module, and then presents the result in the appropriate format. It
does _not_ implement that functionality or contain other opinions
unrelated to "what is the user asking for" and "how to present the
result".

Basically, if it's not "parse user intent" or "print the result", then
it belongs elsewhere! You can spike it out here, but it _must_ find a
home in another project.
