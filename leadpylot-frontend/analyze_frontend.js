const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, 'src/app');
const COMPONENTS_DIR = path.join(__dirname, 'src/components');

function getRoutes(dir, prefix = '') {
    let routes = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            // Handle route groups (e.g., (auth))
            const segment = item.name;
            let newPrefix = prefix;

            if (!segment.startsWith('(') && !segment.startsWith('_') && !segment.startsWith('.')) {
                newPrefix = `${prefix}/${segment}`;
            }

            // Check if this directory is a page
            if (fs.existsSync(path.join(dir, item.name, 'page.tsx')) || fs.existsSync(path.join(dir, item.name, 'page.js'))) {
                routes.push({
                    path: newPrefix || '/',
                    file: path.join(dir, item.name, 'page.tsx') // simplified
                });
            }

            routes = routes.concat(getRoutes(path.join(dir, item.name), newPrefix));
        }
    }
    return routes;
}

function getComponents(dir) {
    let components = [];
    if (!fs.existsSync(dir)) return components;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            components = components.concat(getComponents(path.join(dir, item.name)));
        } else if (item.name.endsWith('.tsx') || item.name.endsWith('.jsx')) {
            components.push(path.relative(COMPONENTS_DIR, path.join(dir, item.name)));
        }
    }
    return components;
}

console.log('# Frontend Analysis Report\n');

console.log('## Pages (Routes)\n');
const routes = getRoutes(APP_DIR);
routes.sort((a, b) => a.path.localeCompare(b.path));
routes.forEach(r => {
    console.log(`- \`${r.path}\``);
});

console.log('\n## Components\n');
const components = getComponents(COMPONENTS_DIR);
// Group by directory
const componentGroups = {};
components.forEach(c => {
    const dir = path.dirname(c);
    if (!componentGroups[dir]) componentGroups[dir] = [];
    componentGroups[dir].push(path.basename(c));
});

for (const [group, items] of Object.entries(componentGroups)) {
    console.log(`### ${group === '.' ? 'Root' : group}`);
    items.forEach(i => console.log(`- ${i}`));
    console.log('');
}
