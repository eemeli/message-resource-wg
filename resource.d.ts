/**
 * The data model representation of a message resource.
 *
 * This interface is generic, to allow for metadata and entry values
 * to be represented by their parsed representations,
 * and for invalid resources to be represented.
 *
 * This is not a CST, so does not encode whitespace or empty lines.
 * Users are encouraged to not consider them significant,
 * and to always normalize the syntax representation of a resource
 * when manipulating it programmatically.
 *
 * Similarly, all character escapes are processed in this representation
 * (for all identifiers, and for `string` metadata and entry values),
 * and users are encouraged to always normalize
 * the syntax representation of escaped characters.
 *
 * @typeParam M - Metadata value type
 * @typeParam V - Entry value type
 * @typeParam J - If `true`, the resource body may include Junk
 */
export interface Resource<M = string, V = string, J extends boolean = false> {
  /**
   * A comment on the whole resource, which applies to all of its entries.
   *
   * May contain multiple lines separated by `\n` characters.
   * For each line, the `#` sigil and up to one space or tab is trimmed
   * from the start of the line, along with any trailing whitespace.
   * In the syntax, each line will be prefixed by `#` and if the line is not empty, one space.
   * 
   * An empty or whitespace-only comment will be represented by an empty string.
   *
   * In the syntax, resource comments are separated from the rest of the resource
   * by a frontmatter separator line `---`.
   */
  comment: string;

  /**
   * Metadata attached to the whole resource.
   *
   * In the syntax, these are separated from the rest of the resource
   * by a frontmatter separator line `---`.
   */
  meta: Metadata<M>[];

  /**
   * The body of a resource, consisting of an array of
   * - section headers
   * - message entries
   * - comments
   * - optionally, any junk content that could not be parsed.
   *
   * Each of the above may be identified by its string `type` property.
   *
   * Empty lines are not included in the body.
   *
   * A valid resource may have an empty body.
   */
  body: Line<M, V, J>[];
}

export type Line<M = string, V = string, J extends boolean = false> =
  | SectionHead<M>
  | Entry<M, V>
  | Comment
  | (J extends true ? Junk : never);

/**
 * Metadata is attached to a resource, section, or a single entry.
 */
export interface Metadata<M = string> {
  /**
   * A non-empty string keyword.
   *
   * Most likely a sequence of `a-z` characters,
   * but may technically contain _any_ characters
   * which might require escaping in the syntax.
   */
  key: string;

  /**
   * The metadata contents.
   *
   * String values have all their character \escapes processed.
   * Note that the processed values of `\\`, `\{`, `\|`, and `\}`
   * are exactly the same characters sequences.
   */
  value: M;
}

export interface SectionHead<M = string> {
  type: "section";

  /**
   * A comment on the whole section, which applies to all of its entries.
   *
   * May contain multiple lines separated by `\n` characters.
   * For each line, the `#` sigil and up to one space or tab is trimmed
   * from the start of the line, along with any trailing whitespace.
   * In the syntax, each line will be prefixed by `#` and if the line is not empty, one space.
   * 
   * An empty or whitespace-only comment will be represented by an empty string.
   * */
  comment: string;

  /** Metadata attached to this section. */
  meta: Metadata<M>[];

  /**
   * The section identifier.
   *
   * Each `string` part of the identifier MUST be a non-empty string.
   * 
   * The resource syntax requires this array to be non-empty,
   * but empty identifier arrays MAY be used
   * when this data model is used to represent other message resource formats,
   * such as Fluent FTL files.
   *
   * The identifiers of entries following a section header are not normalized,
   * i.e. they do not include this identifier.
   */
  id: string[];
}

export interface Entry<M = string, V = string> {
  type: "entry";

  /**
   * A comment on this entry.
   *
   * May contain multiple lines separated by `\n` characters.
   * For each line, the `#` sigil and up to one space or tab is trimmed
   * from the start of the line, along with any trailing whitespace.
   * In the syntax, each line will be prefixed by `#` and if the line is not empty, one space.
   * 
   * An empty or whitespace-only comment will be represented by an empty string.
   * */
  comment: string;

  /** Metadata attached to this entry. */
  meta: Metadata<M>[];

  /**
   * The entry identifier.
   *
   * This MUST be a non-empty array of non-empty `string` values.
   *
   * The identifiers of entries following a section header are not normalized,
   * i.e. they do not include its identifier.
   *
   * In a valid resource, each entry has a distinct normalized identifier,
   * i.e. the concatenation of its section header identifier (if any) and its own.
   */
  id: string[];

  /**
   * The value of an entry, i.e. the message.
   * 
   * String values have all their character \escapes processed.
   * Note that the processed values of `\\`, `\{`, `\|`, and `\}`
   * are exactly the same characters sequences.
   */
  value: V;
}

export interface Comment {
  type: "comment";

  /**
   * A standalone comment.
   *
   * May contain multiple lines separated by `\n` characters.
   * For each line, the `#` sigil and up to one space or tab is trimmed
   * from the start of the line, along with any trailing whitespace.
   * In the syntax, each line will be prefixed by `#` and if the line is not empty, one space.
   * 
   * An empty or whitespace-only comment will be represented by an empty string.
   * */
  comment: string;
}

export interface Junk {
  type: "junk";

  /**
   * Raw source contents from an invalid resource.
   * 
   * If junk is included in the parsed representation of a resource,
   * it represents content that failed to parse.
   */
  source: string;
}
