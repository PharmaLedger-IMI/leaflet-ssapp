const { addHook } = WebCardinal.preload;

async function defineNativeComponents() {
    const define = async (name) => {
        const { default: component } = await import(`../components/${name}/${name}.js`);
        customElements.define(name, component);
    };

    await Promise.all([
        define('leaflet-spinner'),
    ]);
}

function defineWebCardinalComponents() {
    const { define } = WebCardinal.components;

    define('page-template', 'page-template/page-template');
    define('scan-button', 'scan-button/scan-button');
    define('scan-header', 'scan-header/scan-header');
    define('landing-header', 'landing-header/landing-header');
    define('menu-popover', 'menu-popover/menu-popover');
    define('accordion-item', 'accordion-item/accordion-item');
}

function overwriteIframeLog() {
    console.warn = (...args) => console.log(...args);
}

addHook('beforeAppLoads', async () => {
    overwriteIframeLog();

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
