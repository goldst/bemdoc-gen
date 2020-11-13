# ![(logo)](logo.svg) bemdoc-gen
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](code_of_conduct.md) [![NPM Version](https://img.shields.io/npm/v/bemdoc-gen.svg)](https://www.npmjs.com/package/bemdoc-gen)

`bemdoc-gen` is a lightweight tool for generating visual and interactive documentation pages for CSS components.

When creating a web project with many CSS files, it is easy to lose track on content and interdependencies. Often, these CSS files are organized within different folders, called components or blocks. `bemdoc-gen` parses the CSS files and adds a HTML documentation file to each block.

Originally, this project was made with the [BEM methodology](http://getbem.com/) in mind, but it works really well without it too.

**Attention**: This project is work-in-progress – some features won't work yet.

## :pen: Annotating your CSS files
`bemdoc-gen` requires some simple annotation at any place in your CSS files to work, for example:
```css
/**
 * This is a simple button block.
 * @tree
 *   .button.botton--image : div | span
 *     .button__icon : img
 *     .button__text : button
 * @variable {color} [--button--color=black] foreground/text color
 */
```
If you want to, feel free to take a look at the [complete annotation syntax](/annotation.md).

## :computer: Usage
Use the package manager [npm](https://www.npmjs.com/get-npm) to install and run `bemdoc-gen`.

If you just want to try the program once without installing it globally, just run
```
> npx bemdoc-gen <folder>
```
where `<folder>` is the folder that contains the block folders. Your output files will land in the block folders and will have the format `*.bemdoc.html`. If you want to, you can add that to your `.gitignore` file.

If you like `bemdoc-gen` and want to keep it, install it with
```
> npm install -g bemdoc-gen
```
and whenever you need it, just run
```
> bemdoc-gen <folder>
```

If you need example data, clone [goldst.github.io](https://github.com/goldst/goldst.github.io) and run `bemdoc-gen` on the `blocks` folder.

## :octocat: Contributing
`bemdoc-gen` is far from being done. Even though the state of code and ideas is a bit messy right now, you are invited to participate! For more information how you can help, have a look at [the contribution page](/CONTRIBUTING.md) and the [code of conduct](/CODE_OF_CONDUCT.md).

If you use `bemdoc-gen` in your own project, I'd love to hear from you! You can drop me an e-mail at 𝕝𝕖𝕠𝕟𝕒𝕣𝕕-𝕘𝕠𝕝𝕕𝕤𝕥𝕖𝕚𝕟@𝕠𝕦𝕥𝕝𝕠𝕠𝕜.𝕕𝕖 (if you can read it, you are probably not a :robot:) or even better, just file an issue.

## :page_with_curl: License
[MIT](/LICENSE)