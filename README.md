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

### How to Contribute

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

## Syntax

As currently specified, a message resource looks like this (syntax highlighting only approximate):

```ini
@locale en-US
---

one = A message with no properties

@version 3
@since 2023-11-30
two = A message with some properties

# Freeform comments must come before properties
@param $foobar - An input argument
                 with a multiline value
three = Some {$foobar} message
  with a multiline value

# Properties also attach to section-heads
@deprecated
[section]

four = Foo
```

This represents four `en-US` messages with keys `one`, `two`, `three`, and `section.four`.
The comments and `@properties` each attach to the next
section header, message entry, or resource frontmatter separator (not separated by whitespace).
Properties and message values may be multiline, provided that each of the following lines is indented by some whitespace.
All leading whitespace is trimmed from each line, unless it's `\` escaped.

The exact syntax for properties and
[message values](https://github.com/unicode-org/message-format-wg/blob/main/spec/syntax.md)
is defined separately.
The canonical definition of the resource syntax is found in [`resource.abnf`](./resource.abnf).

## Data Model

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
