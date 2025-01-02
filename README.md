# Message Resource Working Group

The purpose of this effort is to
develop a standard for [Unicode MessageFormat 2] resources,
which may be used as a file format or otherwise.

[unicode messageformat 2]: https://github.com/unicode-org/message-format-wg

In this context, a "resource" is a collection of related messages
that may need to be stored, transmitted and/or handled together.
A resource may classify its messages into groupings,
and it may include additional data or metadata relating to them.
It should be possible to represent a resource in a text-based human-friendly manner.

This work was [presented](https://www.youtube.com/watch?v=ksgm_B-uUCU)
at the [2024 Unicode Tech Workshop](https://www.unicode.org/events/utw/2024/).

### Why?

The work on MessageFormat 2 has identified the following challenges
that go beyond or arise from the new message format,
but which are not well addressed by existing resource formats:

- The MessageFormat 2 syntax is naturally multi-line,
  and multi-line values are not easy to use in many of the current resource formats.
- Comments and metadata are important for translators,
  but (mostly) not relevant for formatting.
  Their attachment to messages needs to be well specified,
  while being easy to read, write, and ignore.
- Structured message metadata needs a common schema to be universally understood.
- Many messages are composed of multiple localizable parts,
  and it should be possible to express a compound message formed of multiple connected parts.
- A purpose-built localization resource format should be well specified,
  and designed from the ground up to work with multiple implementations.

Some of these aspects are well supported by existing formats,
but no one resource format serves all of the identified use cases.
For instance:

- Comments in Gettext .po files come in multiple types and [clearly assign] to the following entry,
  but its representation of multi-line values is rather clumsy.
- Fluent supports composability via [attributes] and [message references],
  but its FTL format is tightly coupled with its own message format.
- XLIFF is an [OASIS Standard],
  but it's primarily a machine interchange format that is not designed for human authoring
  and its message representation does not provide for message variants.

It would of course be possible to define a JSON or XML Schema
for a resource format that would address all of the above issues.
However, while JSON and XML are relatively easy to read, they are not easy to _write_.
This would disadvantage in particular translators
who do not have access to tooling beyond a simple text editor.
JSON/XML schemas could of course be defined as a part of the effort,
to represent a data model view of the resource formats,
complimenting the [message data model].

[clearly assign]: https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html
[attributes]: https://projectfluent.org/fluent/guide/attributes.html
[message references]: https://projectfluent.org/fluent/guide/references.html
[message data model]: https://github.com/unicode-org/message-format-wg/tree/main/spec/data-model
[OASIS Standard]: https://docs.oasis-open.org/xliff/xliff-core/v2.1/os/xliff-core-v2.1-os.html

### Paths to Adoption

The field of localization is not new, and already features many competing solutions,
with workflows, tools and practices used by many different projects,
each of which have different needs.
In this environment, a new solution should not aim to replace all parts at once,
but to provide a modular, layered approach that users could benefit from
without needing to adopt all parts of the new standard.

This approach is already fundamental to the MessageFormat 2 specification,
which is designed to be embeddable in any existing resource formats.
The resource format work should follow a similar approach,
for example by ensuring that its data model provides not only a useful representation
of any syntax representation of a resource format defined here,
but also all existing resource formats.
Doing so makes it much easier for resource format conversion tools to be built,
not only to the new format, but even between existing formats.

Similarly, a well-defined set of message properties or metadata
could be adopted completely separately from the rest of the specification.
It should still be defined within the context of the new resource format,
to ensure that its requirements are addressed by the resource format,
and as an essential part in ensuring compatibility with existing formats.

## Deliverables

Within the overall purpose of defining a new resource format,
the work can be split into the following parts:

1. Defining the resource syntax.
2. Defining the data model representation of a resource.
3. Defining a vocabulary for message and resource properties/metadata.

While the primary driver for the work is to support MessageFormat 2,
other current and future localization formats also need to be considered.
For example, it should be possible to:

- represent a Gettext `.po` file using the data model,
- use the same message properties within some other custom resource format, or
- embed messages with a different format than MF2 in a message resource.

The definition of a resource loader is not within the scope of this work,
except insofar as its concerns impact the deliverables enumerated above.

### Syntax

As currently proposed,
a message resource looks like this
(syntax highlighting only approximate):

```ini
# The resource-level locale is the only required property.
@locale en-US
---

one = A plain, simple message.

@version 2.1
@max-length 42
two = A message with some properties

# Freeform comments must come before properties.
# Multiline messages and properties are indented,
# with each line's leading whitespace trimmed from their value.
@param $foobar - An input argument
                 with a multiline description
three = Some {$foobar} message
  with a multiline value
  \  and a third line that starts with two spaces.

# Sections are separated by section headers.
[section]

four =
  .input {$count :integer}
  .match $count
  0   {{You have no messages.}}
  one {{You have {$count} message.}}
  *   {{You have {$count} messages.}}

# Properties attached to section heads apply to all messages within.
# Sections do not nest, but may use . as separator for multi-part names.
@do-not-translate
[other.section]

# This message (other.section.five) should not be modified from the original.
five = Foo
```

This represents four `en-US` messages with keys `one`, `two`, `three`, `section.four`, and `other.section.five`.
The comments and `@properties` each attach to the next
section header, message entry, or resource frontmatter separator (not separated by whitespace).
Properties and message values may be multiline, provided that each of the following lines is indented by some whitespace.
All leading whitespace is trimmed from each line, unless it's `\` escaped.

The exact syntax for properties and
[message values](https://github.com/unicode-org/message-format-wg/blob/main/spec/syntax.md)
is defined separately.
The canonical definition of the resource syntax is found in [`resource.abnf`](./resource.abnf).

### Data Model

A message resource data model corresponding to the syntax definition
is included as [`resource.d.ts`](./resource.d.ts),
an extensively commented TypeScript definition.

To enable interchange, a JSON Schema definition of the data model
is also provided in [`resource.json`](./resource.json).
This corresponds to `Resource<Message, false>`
in the parametric TypeScript definition,
where `Message` is a [MessageFormat 2 Message](https://github.com/unicode-org/message-format-wg/blob/main/spec/data-model/README.md#messages).

As with the MessageFormat 2 data model,
the message resource JSON Schema relaxes some aspects of the data model,
allowing comment and metadata values to be optional rather than required properties.

## How to Contribute

- **Issues** are for specific aspects of the resulting specification.
  Discussions here should be focused, and stay on topic.
  New issues must include a sufficient initial description to introduce themselves,
  and may contain an exploration of possible solutions to them.
- **Pull requests** help develop and define the eventual specification.
  Accepting and merging a PR should not be taken as the final word on any topic,
  but each change should be an improvement on the previous.
  Each PR should only apply one change that may be squashed to the `main` branch.
  Text content should use [semantic line breaks](https://sembr.org/).
  A PR may close one or more issues, but this is not required.
- **Discussions** are freeform, and may well refer to multiple issues or topics.
  This is also the forum in which we should develop further our ways of working,
  which may also include interactions and forums outside this repository,
  such as occasional video calls.

We welcome your participation and interest!
