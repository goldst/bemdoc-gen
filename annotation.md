# bemdoc annotation informal syntax description
`bemdoc` annotation is inspired by the format of [Javadoc Doc Comments](https://www.oracle.com/technical-resources/articles/java/javadoc-tool.html). That means that at any place in your CSS file, you can place comments of the format
```css
/**
 * <content>
 */
```

where `<content>` is a block description, followed by lines with tags of your choice:

## `@variable {<type>} [<name>=<defaultValue>] <description>`
Describes a [CSS custom property](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties), also known as *CSS variable*, that the block expects.
- `<type>`: Describes the type of the variable. In reality, CSS variables don't really have a fixed type, so you can write anything you want as long as it gives the user an idea what you mean. Types like `color` or `number` make sense.
- `<name>`: name of the variable, starts with `--`.
- `<defaultValue>`: a recommended value for the variable. In the generated bemdoc, that will be the default value, but the user will be able to experiment with all kinds of values.
- `<description>`: description of what the variable influences in the block.

## `@tree <tree>`
Describes what the block HTML could look like. Instead of writing the html tags, `<tree>` information is structured by indentation. One line of `<tree>` consists of `<classes> : <tags>` where
- `<classes>` is a list of CSS classes, each starting with `.`, joined with nothing else in between them.
- `<tags>` is a list of HTML tag names, joined with ` | ` between the tag names.

## `@extends <fileLocation>`
Tells bemdoc-gen to not generate a documentation file if it is already generating one for the file it points at. All annotation will be interpreted as if it was in the other file.
- `<fileLocation>`: relative path to the main file

## `@requires <fileLocation>`
Tells bemdoc-gen that this block, for correct representation, needs another file. The file can be either a `.js` or `.css` file. This tag wont change the annotations of the selected file.
- `<fileLocation>`: relative path to the required file

## `@todo <description>`
- `<description>` will be printed to the console as a todo at generation time


