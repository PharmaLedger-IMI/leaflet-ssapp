const { addHook } = WebCardinal.preload;

async function defineNativeComponents() {
    const define = async (name) => {
        const { default: component } = await import(`../components/${name}/${name}.js`);
        customElements.define(name, component);
    };

    await Promise.all([
        define('leaflet-shortcuts'),
        define('leaflet-section'),
        define('leaflet-button'),
    ]);
}

function defineWebCardinalComponents() {
    const { define } = WebCardinal.components;

    define('page-template', 'page-template/page-template');
    define('scan-button', 'scan-button/scan-button');
    define('scan-header', 'scan-header/scan-header');
    define('landing-header', 'landing-header/landing-header');
    define('menu-popover', 'menu-popover/menu-popover');
    define('history-item', 'history-item/history-item');
    define('accordion-item', 'accordion-item/accordion-item');
}

addHook('beforeAppLoads', async () => {
    try {
        await defineNativeComponents();
    } catch (error) {
        console.error('Error while defining Custom HTML Elements', error);
    }

    try {
        defineWebCardinalComponents();
    } catch (error) {
        console.error('Error while defining WebCardinal components', error);
    }
});
