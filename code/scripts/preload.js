import SettingsService from "./services/SettingsService.js";
import appLanguages from "../appLanguages.js";

const {addHook} = WebCardinal.preload;

async function defineNativeComponents() {
  const define = async (name) => {
    const {default: component} = await import(`../components/${name}/${name}.js`);
    customElements.define(name, component);
  };

  await Promise.all([
    define('leaflet-spinner'),
  ]);
}

function defineWebCardinalComponents() {
  const {define} = WebCardinal.components;

  define('page-template', 'page-template/page-template');
  define('scan-button', 'scan-button/scan-button');
  define('scan-header', 'scan-header/scan-header');
  define('landing-header', 'landing-header/landing-header');
  define('menu-popover', 'menu-popover/menu-popover');
  define('accordion-item', 'accordion-item/accordion-item');
  define('info-page', 'info-page/info-page');
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
  let dbApi = require("opendsu").loadApi("db");
  try {
    let enclaveDB = await $$.promisify(dbApi.getMainEnclaveDB)();
    let settingsService = new SettingsService(enclaveDB);
    let preferredAppLanguage = await settingsService.asyncReadSetting("preferredLanguage");

    if (!preferredAppLanguage) {
      let userLang = window.navigator.language.slice(0, 2);
      let appLang = Object.keys(appLanguages).find(lang => lang === userLang) ? userLang : "en";
      await settingsService.asyncWriteSetting('preferredLanguage', appLang);

    }
  } catch (e) {
    console.log('Error on getting enclave DB', e);
    return;
  }


});

addHook('afterAppLoads', () => {
  document.querySelector("body > .loader-container").setAttribute('style', 'display:none');
})
