const fs = require('fs');
const path = require('path');
const package = require('./package.json');

class Tree {
    constructor(root, description, dependencies = []) {
        this.root = root;
        this.description = description;
        this.dependencies = dependencies;
    }

    isSimilar(compareTree) {
        return this.root.isSimilar(compareTree.root);
    }

    isSame(compareTree) {
        return this.root.isSame(compareTree.root);
    }

    combine(addTree) {
        return new Tree(
            this.root.combine(addTree.root),
            this.description + ' ' + addTree.description
        );
    }
}

class TreeNode {
    constructor(names = '', children = [], types = []) {
        this.names = names;
        this.types = types;
        this.children = children;
    }

    get name() {
        return this.names[0];
    }

    get type() {
        return this.types[0] || 'div';
    }

    basesOn(compareNode) {
        const t = this;

        return this.name === compareNode.name &&
            this.children.every(child => compareNode.children
                .filter(compareChild => compareChild.name === child.name)
                .some(child.basesOn)
            );
    }

    isSimilar(compareNode) {
        return this.basesOn(compareNode) || compareNode.basesOn(this);
    }

    isSame(compareNode) {
        return this.name === compareNode.name &&
            this.children.every(child => compareNode.children.some(compareChild => child.isSame(compareChild))) &&
            compareNode.children.every(compareChild => this.children.some(child => compareChild.isSame(child)));
    }

    combine(addNode) {
        const t = this;

        this.children.map

        const newNode = new TreeNode //TODO

        return this;
    }

    get html() {
        return `<${this.type} class="${this.names.join(' ').replace(/\./g, ' ').trim()}">` +
            this.children.map(child => child.html).join('') +
            `</${this.type}>`;
    }
}

class TextNode extends TreeNode {
    constructor(text) {
        super([text], [], ['text']);
    }

    get html() {
        return this.name;
    }
}

async function* getFiles() {
    const blocksPath = process.argv[2];

    if(blocksPath === undefined) {
        console.error('no path specified');
        return;
    }

    const blockFolders = await fs.promises.readdir(blocksPath, { withFileTypes: true });

    for (const blockFolder of blockFolders) {
        if(!blockFolder.isDirectory()) {
            continue;
        }

        const cssFiles = await fs.promises.readdir(path.resolve(blocksPath, blockFolder.name), { withFileTypes: true });

        for (const cssFile of cssFiles) {
            if(cssFile.isDirectory() || !cssFile.name.endsWith('css')) {
                continue;
            }

            const cssFilePath = path.resolve(blocksPath, blockFolder.name);

            yield {
                path: cssFilePath,
                name: cssFile.name,
                content: await fs.promises.readFile(path.resolve(cssFilePath, cssFile.name), { encoding: 'utf8' })
            };
        }
    }
}

function* getComments(fileContent) {
    const regex = /\/\*\*\n((\s*\*\s*.*\n)*)\s*\*\//gm;
    let matches;

    do {
        matches = regex.exec(fileContent);

        if (matches) {
            const result = matches[1]
                .split(/(?=\@)/)
                .map(section => section
                    .split(/^\s*\*/gm)
                    .filter(line => line !== ''));

            yield result;
        }
    } while(matches);
}

function* allCombinations(arrarr) {
    if(arrarr.length === 0) {
        yield [];
    } else {
        for(const fstelem of arrarr[0]) {
            const restarr = allCombinations(arrarr.slice(1));

            for(const restelems of restarr) {
                yield [fstelem, ...restelems];
            }
        }
    }
}

function* getTreeNodesFromOrNode(orNode) {
    for(const name of orNode.names) {
        if(orNode.type !== 'text') {
            const possibleChildren = Array.from(allCombinations(
                orNode.children
                    .map(getTreeNodesFromOrNode)
            ));

            for(const children of possibleChildren) {
                const newTreeNode = new TreeNode([name], children);
                newTreeNode.types = orNode.types;
                yield newTreeNode;
            }
        } else {
            yield orNode;
        }
    }
}

function* getTreesFromOrTree(orTree) {
    for(const root of getTreeNodesFromOrNode(orTree.root)) {
        yield new Tree(root, orTree.description, orTree.dependencies);
    }
}

function getOrNode(treeComment) {
    if(treeComment.length === 0) {
        return null;
    }

    if(treeComment[0] === '') {
        return getOrNode(treeComment.slice(1));
    }

    let orNode;

    if(treeComment[0].match(/^\s*\[.*\]\s*/gm)) {
        orNode = new TextNode(treeComment[0].trim().slice(1, -1));
    } else {
        const [names, types] = treeComment[0].split(':');
    
        orNode = new TreeNode(
            names.split(',').map(name => name.trim()),
            [],
            types ? types.split(',').map(type => type.trim()) : []
        );
    }

    if(treeComment.length > 1) {
        treeComment = treeComment.slice(1);

        const childWhiteSpace = treeComment[0].search(/\S/);

        orNode.children = treeComment
            .join('')
            .split(new RegExp(`(?<=^)(?=\\s{${childWhiteSpace}}\\S)`, 'gm'))
            .map(childComment =>
                childComment
                    .split(/(?<=^)/gm)
                    .map(line => line.slice(childWhiteSpace))
            )
            .map(getOrNode);
    } else {
        orNode.children = [];
    }

    return orNode;
}

class Variable {
    constructor(text) {
        const regexp = /\{(.*)\}\s*\[(--.*)=(.*)\]\s*(.*)/g;
        if((RegExp(regexp, 'g').test(text))) {
            let _;
            [_, this.type, this.name, this.default, ...this.description] = Array.from((RegExp(regexp, 'g')).exec(text));
        } else {
            console.error('cannot parse variable "' + text + '"');
            this.type = '';
            this.name = '';
            this.default = '';
            this.description = '';
        }
    }
}

function getOrTreeAndRelevantObjects(comment) {
    let root, description, variables=[], dependencies=[];

    for(const section of comment) {
        if(section[0].match(/^@tree\s/gm)) {
            section[0] = section[0].slice(6);
            root = getOrNode(section);
        } else if(section[0].match(/^@variable\s/gm)) {
            section[0] = section[0].slice(10);
            variables.push(new Variable(section.map(l => l.trim()).join(' ')));
        } else if(section[0].match(/^@extends\s/gm)) {
            console.warn('the current css file is an extension to another one. The bemdoc will most likely not work correctly for this file, consider generating for the file that is extended');
        } else if(section[0].match(/^@requires\s/gm)) {
            dependencies.push(section[0].slice(10));
        } else if(section[0].match(/^@/gm)) {
            console.warn('unknown section type ' + section[0].split(/\s/gm)[0]);
        } else {
            description = section
                .map(line => line.trim())
                .join(' ')
                .trim();
        }
    }

    if(!root) {
        root = new TreeNode([], []);

        if(!variables.length) {
            console.warn('could not find any useful content in comment');
        }
    }

    const tree = new Tree(root, description);
    tree.dependencies.push(...dependencies);

    return {
        tree: tree,
        variables: variables,
        dependencies: dependencies
    };
}

function getTreesAndRelevantObjects(comment) {
    const objects = getOrTreeAndRelevantObjects(comment);
    return {
        trees: Array.from(getTreesFromOrTree(objects.tree)),
        variables: objects.variables,
        dependencies: objects.dependencies
    };
}

function generateCombinationTrees(trees) {
    if(trees.length < 2) return trees;

    for(let i = 1; i < trees.length; i++) {
        for(let j = 0; j < i; j++) {
            if(trees[i].isSimilar(trees[j])) {
                const newTree = trees[i].combine(trees[j]);
                if(!trees.some(tree => newTree.isSame(tree))) {
                    trees.push(newTree);
                }
            }
        }
    }
    return trees;
}

function* getFiltersFromNode(node) {
    yield node.name;
    for(child of node.children) {
        if(node.type !== 'text') {
            yield* getFiltersFromNode(child);
        }
    }
}

function* getFiltersFromTrees(trees) {
    for(tree of trees) {
        yield* getFiltersFromNode(tree.root);
    }
}

function structureFilterNodes(filterNodes) {
    for(let i = 0; i < filterNodes.length; i++) {
        const firstFilterNode = filterNodes.shift();

        const isChild = filterNodes.some(filterNode => {
            if(firstFilterNode.name.startsWith(filterNode.name)) {
                filterNode.children.push(firstFilterNode);
                return true;
            } else {
                return false;
            }
        });

        if(!isChild) {
            filterNodes.push(firstFilterNode);
        }
    }

    return filterNodes.map(filterNode => {
        filterNode.children = structureFilterNodes(filterNode.children);
        return filterNode;
    });
}

function structureFilters(filters) {
    return structureFilterNodes(
        filters.map(filter => new TreeNode([filter]))
    );
}

function filterCheckboxesFromStructuredFilters(filters) {
    return '<div class="filters__group">\n' +
        filters.map((filter, i) => {
            const f = filter.name.replace(/[\.\(\)]/gm, '_-_');
            return (
                `<div><input type="checkbox" name="checkbox--${f}" onchange="checkbox${i}Change(event)" checked>${filter.name}</div>\n` +
                filterCheckboxesFromStructuredFilters(filter.children) +
                `<style id="disable-style--${f}" media="max-width: 1px">.block-variant--${f}{display:none}</style>` +
                `<script type="text/javascript">function checkbox${i}Change(e) {
                    const style = document.getElementById('disable-style--${f}');
                    if(e.target.checked) {
                        style.setAttribute('media', 'max-width: 1px');
                    } else if(style.hasAttribute('media')){
                        style.removeAttribute('media');
                    }
                }</script>`
            );
        }).join('') +
        '</div>\n';
}

function* treesToHTMLArray(trees, fileName) {
    for(tree in trees) {
        const filters = 
            Array.from(getFiltersFromNode(trees[tree].root))
                .map(filter => 
                    'block-variant--' + 
                    filter.replace(/\./gm, '_-_'))
                .join(' ');

        yield `<div class="block-variant ${filters}">
            <div class="block-variant__description">
                <p>${trees[tree].description}</p>
            </div>
            <form action="" class="block-variant__form block-variant__form--dependencies">
                <p>Dependencies:</p>
                <textarea name="" id="block-variant__dependencies--${tree}" class="block-variant__dependencies" onkeyup="loadMarkup${tree}()" cols="30">${trees[tree].dependencies.map(d => `<link rel="stylesheet" type="text/css" href="${d}">`).join('\n')}</textarea>
            </form>
            <form action="" class="block-variant__form block-variant__form--markup">
                <p>Markup:</p>
                <textarea name="" id="block-variant__markup--${tree}" class="block-variant__markup" onkeyup="loadMarkup${tree}()" cols="30">${trees[tree].root.html}</textarea>
            </form>
            <iframe frameborder="0" id="block-variant__preview--${tree}" class="block-variant__preview" onload="loadMarkup${tree}()"></iframe>
        </div>
        <script type="text/javascript">
            function loadMarkup${tree}() {
                const dependencies = document.getElementById('block-variant__dependencies--${tree}').value;
                const markup = document.getElementById('block-variant__markup--${tree}').value;
                const iframe = document.getElementById('block-variant__preview--${tree}');

                if(iframe && iframe.contentWindow) {
                    iframe.contentWindow.document.open();
                    iframe.contentWindow.document.write(
                        '<head><link rel="stylesheet" type="text/css" href="${fileName}">' +
                        dependencies +
                        '</head>' +
                        '<style> :root{' +
                        variableStyles() +
                        '} </style>' +
                        '<body>' + markup + '</body>');
                    iframe.contentWindow.document.close();

                    sizeMinimize(iframe);   
                }
            }
            function variableStyles() {
                let out = "", valElem;
                for(let i = 0; valElem = document.getElementById('variables__input--' + i); i++) {
                    const varName = document.getElementById('variables_name--' + i).innerHTML;

                    if(valElem.value) {
                        out += varName + ': ' + valElem.value + ';';
                    }
                }
                return out;
            }
        </script>`.replace(/(^\s*)|\n/gm, '');
    }
}

function buildPage(fileName, filterMarkup, variableMarkup, blockMarkups) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>bemdoc ${fileName} Documentation</title>
    </head>
    <body>
        <style>
            body {
                margin: 8px;
                font-family: sans-serif;
            }
            p, h1, h2 {
                margin: 0;
            }
            .title, .block-variants-title {
                margin-left: 8px;
                grid-area: title;
            }
            .sidebar {
                border: 2px solid gray;
                border-radius: 8px;
                padding: 8px;
                margin-bottom: 8px;
                grid-area: sidebar;
            }
            button, input[type=button], input[type=text] {
                border: 2px solid gray;
                border-radius: 8px;
                padding: 0;
                min-width: 32px;
                height: 32px;
                background-color: gray;
                margin: 0 0 8px 8px;
                box-sizing: border-box;
            }
            input[type=text] {
                background-color: white;
                padding: 0 8px;
            }
            .filters__group {
                margin-left: 16px;
            }
            .variables__row {
                display: flex;
                align-items: baseline;
            }
            .variables__input {
                flex-grow: 1;
            }
            .block-variant {
                border-radius: 8px;
                background-color: gray;
                padding: 8px;
                margin-bottom: 8px;
            }
            .block-variant__preview {
                background-color: white;
                height: 0;
                grid-area: preview;
                transition: height 0.2s;
            }
            .block-variant__description {
                grid-area: description;
                margin-bottom: 8px;
            }
            .block-variant__form--markup {
                grid-area: markup;
            }
            .block-variant__description,
            .block-variant__form>textarea,
            .block-variant__preview {
                width: 100%;
                border: none;
            }
            .block-variant__form>textarea {
                margin: 0;
                resize: vertical;
            }
            footer {
                grid-area: footer;
            }
            @media screen and (min-width: 800px) {
                body {
                    display: grid;
                    grid-template-columns: 360px auto;
                    grid-template-rows: auto 1fr auto;
                    grid-template-areas:
                        "sidebar title"
                        "sidebar main"
                        "footer footer";
                    grid-column-gap: 8px;
                }
            }
            @media screen and (min-width: 1120px) {
                .block-variant {
                    display: grid;
                    grid-template-rows: auto auto 1fr;
                    grid-template-columns: 1fr 1fr;
                    grid-template-areas:
                        "description preview"
                        "dependencies preview"
                        "markup preview";
                    grid-column-gap: 8px;
                }
                .block-variant__preview {
                    height: 100%;
                }
            }
        </style>
        <h1 class="title">bemdoc <code>${fileName}</code> Documentation</h1>
        <nav class="sidebar">
            <div class="filters">
                <h2 class="filters__title">Classes</h2>
                <form action="" class="filters__form">
                    <div>
                        <div><input type="radio" name="filters__major-option" checked>all</div>
                        <div><input type="radio" name="filters__major-option">containing at least one of:</div>
                        <div><input type="radio" name="filters__major-option">containing none but:</div>
                    </div>
                    ${filterMarkup}
                </form>
            </div>
            <div>
                <h2>Dependencies</h2>
                <form action="" class="filters__form">
                    <div>
                        <div><input type="radio" name="filters__major-option" checked>all</div>
                        <div><input type="radio" name="filters__major-option">containing at least one of:</div>
                        <div><input type="radio" name="filters__major-option">containing none but:</div>
                    </div>
                    [TODO]
                </form>
            </div>
            <div class="variables">
                <h2 class="variables__title">Variables</h2>
                <form action="" class="variables__form">
                    ${variableMarkup}
                </form>
            </div>
        </nav>
        <main>
            <h2 class="block-variants-title">Available block variants</h2>
            ${blockMarkups.join('\n')}
            <script type="text/javascript">
                function sizeMinimize(iframe) {
                    setTimeout(() => {
                        if(iframe.contentWindow) {
                            iframe.style.minHeight = iframe.contentWindow.document.documentElement.scrollHeight + 'px';
                        }
                    }, 1000);
                }
                function loadMarkups() {
                    for(let i = 0; this['loadMarkup' + i]; i++) {
                        this['loadMarkup' + i]();
                    }
                }
            </script>
        </main>
        <footer>
            <p>Generated with <a href="https://github.com/goldst/bemdoc-generator">bemdoc-generator</a> v${package.version}, the dynamic documentation generator for BEM-based stylesheets by <a href="https://gldstn.dev">Leonard Goldstein</a></p>
        </footer>
    </body>
    </html>`.replace(/(^\s*)|\n/gm, '');
}

function variablesToHTML(variables) {
    return (variables.map((v, i) => `
                <p>${v.description}. Type: <code>${v.type}</code></p><div class="variables__row"><code id="variables_name--${i}">${v.name}</code><input type="text" class="variables__input" id="variables__input--${i}" onkeyup="loadMarkups()" placeholder="${v.default}"><input type="button" value="R" onclick="document.getElementById('variables__input--${i}').value=''; loadMarkups()"></div>
            `.trim())
        .join(''))
}

async function* importFiles(file) {
    const regexp = /^\s*\@import\s*url\("(.+)"\);\s*/
    if(file.content.match(RegExp(regexp))) {
        const importFileName = file.content.match(RegExp(regexp))[1];

        const importFilePath = path.resolve(file.path, importFileName);
        const fileContent = await fs.promises.readFile(importFilePath, { encoding: 'utf8' });

        const importFile =  {
            path: file.path,
            name: importFileName,
            content: fileContent
        };

        // First import
        yield importFile;

        // imports of first import
        yield* await importFiles(importFile);

        // remaining imports
        yield* await importFiles({
            path: file.path,
            name: file.name,
            content: file.content.split('\n').slice(1).join()
        });
    }
}

async function fileToTreesAndRelevantObjects(file) {
    const objects = {
        trees: [],
        variables: [],
        dependencies: []
    };

    for(const comment of getComments(file.content)) {
        const currObjects = getTreesAndRelevantObjects(comment);
        objects.trees.push(...currObjects.trees);
        objects.variables.push(...currObjects.variables);
        objects.dependencies.push(...currObjects.dependencies);
    }

    objects.trees = generateCombinationTrees(objects.trees);

    for await(const importFile of importFiles(file)) {
        const {trees, variables, dependencies} = await fileToTreesAndRelevantObjects(importFile);
        objects.trees.push(...trees);
        objects.variables.push(...variables);
        objects.dependencies.push(...dependencies);
    }

    return objects;
}

async function fileToPage(file) {
    const {trees, variables, dependencies} = await fileToTreesAndRelevantObjects(file);
    
    const filters = Array.from(new Set(getFiltersFromTrees(trees)));
    const filterStructure = structureFilters(filters);
    const filterMarkup = filterCheckboxesFromStructuredFilters(filterStructure);
    const variableMarkup = variablesToHTML(variables);
    const blockMarkups = treesToHTMLArray(trees, file.name);

    return buildPage(file.name, filterMarkup, variableMarkup, Array.from(blockMarkups));
}

(async () => {
    for await (const file of getFiles()) {
        const page = await fileToPage(file);
        await fs.promises.writeFile(
            path.resolve(file.path, file.name + '.bemdoc.html'),
            page);
    }
})();