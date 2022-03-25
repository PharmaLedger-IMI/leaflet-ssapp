import SettingsService from "../services/SettingsService.js";
import constants from "../../constants.js";
import appLanguages from "../../appLanguages.js";

const {WebcController} = WebCardinal.controllers;

export default class SettingsController extends WebcController {
  constructor(...props) {
    super(...props);

    this.model = {
      languageSelectorOpened: false,
      origin: window.location.origin,
      networkEditMode: true,
      scanditLicenseEditMode: true,
      refreshPeriodEditMode: true,
      networkName: {value: constants.DEFAULT_NETWORK_NAME},
      advancedUser: false,
      refreshPeriod: {value: constants.DEFAULT_REFRESH_PERIOD},
      scanditLicense: {value: ""},
      appLanguages: [],
      devOptions: {
        areEnabled: undefined,
        useFrames: {
          // Check also: webcardinal.json > leaflet > devOptions > useFrames
          checked: false, value: 'off'
        }
      }
    };

    const dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }

      this.settingsService = new SettingsService(enclaveDB);

      this.model.preferredLanguage = await this.settingsService.asyncReadSetting("preferredLanguage");
      if (appLanguages[this.model.preferredLanguage]) {
        this.model.appLanguages = appLanguages[this.model.preferredLanguage]
      } else {
        this.model.appLanguages = appLanguages["en"];
      }
      this.model.networkName.value = await this.settingsService.asyncReadSetting("networkName");
      this.model.scanditLicense.value = await this.settingsService.asyncReadSetting("scanditLicense");
      this.model.advancedUser = await this.settingsService.asyncReadSetting("advancedUser");
      this.model.refreshPeriod.value = await this.settingsService.asyncReadSetting("refreshPeriod");

      this.onTagClick("change-edit-mode", (model, target, event) => {
        this.toggleEditMode(target.getAttribute("data"));
      });

      this.onTagClick("change-network", (model, target, event) => {
        let newValue = target.parentElement.querySelector("input").value;
        this.settingsService.writeSetting("networkName", newValue, (err) => {
          if (err) {
            console.log(err);
            return;
          }
          this.model.networkName.value = newValue;
          this.toggleEditMode("networkEditMode");
        });
      });

      this.onTagClick("change-default-network", (model, target, event) => {
        this.settingsService.writeSetting("networkName", constants.DEFAULT_NETWORK_NAME, (err) => {
          if (err) {
            console.log(err);
            return;
          }
          this.model.networkName.value = constants.DEFAULT_NETWORK_NAME;
          this.toggleEditMode("networkEditMode");
        });
      });

      this.onTagClick("change-refresh-period", (model, target, event) => {
        let newValue = target.parentElement.querySelector("input").value;
        this.settingsService.writeSetting("refreshPeriod", newValue, (err) => {
          if (err) {
            console.log(err);
            return;
          }
          this.model.refreshPeriod.value = newValue
          this.toggleEditMode("refreshPeriodEditMode");
        });
      });

      this.onTagClick("change-default-refresh-period", (model, target, event) => {
        this.settingsService.writeSetting("refreshPeriod", constants.DEFAULT_REFRESH_PERIOD, (err) => {
          if (err) {
            console.log(err);
            return;
          }
          this.model.refreshPeriod.value = constants.DEFAULT_REFRESH_PERIOD
          this.toggleEditMode("refreshPeriodEditMode");
        });
      });

      this.onTagEvent('language.select', 'ionChange', this.changeLanguageHandler);
      this.querySelector("ion-checkbox#advancedUserCheckbox").addEventListener("ionChange", (ev) => {
        this.model.advancedUser = ev.detail.checked;
        this.settingsService.writeSetting("advancedUser", ev.detail.checked, (err) => {
          if (err) {
            console.log(err);
            return;
          }
        })
      })

      this.querySelector("ion-checkbox#acdcEnabledCheckbox").addEventListener("ionChange", (ev) => {
        this.model.acdc.enabled = ev.detail.checked;
        this.querySelector(".acdcOptionsContainer").hidden = !this.model.acdc.enabled;
        if (!this.model.acdc.enabled) {
          this.model.acdc.did_enabled = this.model.acdc.location_enabled = this.model.acdc.enabled;
        }
      })

      this.querySelector("ion-checkbox#acdcDidCheckbox").addEventListener("ionChange", (ev) => {
        this.model.acdc.did_enabled = ev.detail.checked;
      })
      this.querySelector("ion-checkbox#acdcLocationCheckbox").addEventListener("ionChange", (ev) => {
        this.model.acdc.location_enabled = ev.detail.checked;
      })

      this.onTagClick("set-scandit-license", (model, target, event) => {
        let newValue = target.parentElement.querySelector("input").value;

        this.settingsService.writeSetting("scanditLicense", newValue, (err) => {
          if (err) {
            console.log(err);
            return;
          }
          this.model.scanditLicense.value = newValue;
          this.toggleEditMode("scanditLicenseEditMode");
        });
      });
    })

    this.onTagClick('navigate-to-native-page', this.navigateToNativeIntegrationPage);

    // ACDC integration settings
    this.acdc = require('acdc').ReportingService.getInstance(this.settingsService);

    this.acdc.setSettingsToModel(this.model, err => console.log(err
      ? `Error Binding ACDC settings to model: ${err}`
      : "Acdc Settings Added"));

    this.setDeveloperOptions();
  }

  toggleEditMode(prop) {
    this.model[prop] = !this.model[prop]
  }

  // Language

  changeLanguageHandler = async (model, target, event) => {
    try {
      if (this.model.preferredLanguage === event.detail.value) {
        return;
      }
      this.model.preferredLanguage = event.detail.value;
      await this.settingsService.asyncWriteSetting('preferredLanguage', this.model.preferredLanguage);
      this.applySkinForCurrentPage(this.model.preferredLanguage);
      this.setSkin(this.model.preferredLanguage);
    } catch (error) {
      console.log('Language can not be changed', error);
    }
  }

  // Developer Options

  getDeveloperOptions = async () => {
    try {
      const file = await fetch('webcardinal.json')
      const data = await file.json();
      if (!data.leaflet || !data.leaflet.devOptions) {
        return [false];
      }
      let isAtLeastOne = false;
      const options = data.leaflet.devOptions;
      const disabled = options.disabled || [];
      const nativeBridgeSupport = window.opendsu_native_apis;

      if (typeof nativeBridgeSupport !== "object") {
        disabled.push("useFrames");
      }
      delete options.disabled;
      const keys = Object.keys(options).filter(key => key !== 'disabled');
      for (const key of keys) {
        if (disabled.includes(key)) {
          delete options[key];
          continue;
        }
        isAtLeastOne = true;
        break;
      }
      if (!isAtLeastOne) {
        return [false];
      }
      return [true, options]
    } catch (error) {
      console.log(error)
      return [false];
    }
  }

  setDeveloperOptions = async () => {
    const [isDevConfigEnabled, options] = await this.getDeveloperOptions();
    this.model.devOptions.areDisabled = !isDevConfigEnabled;
    if (!isDevConfigEnabled) {
      return;
    }

    this.model.addExpression('devOptions.useFrames.value', () => {
      return this.model.devOptions.useFrames.checked ? 'on' : 'off'
    }, 'devOptions.useFrames.checked');

    const value = localStorage.getItem(constants.IOS_USE_FRAMES);
    if (typeof value !== 'string') {
      this.model.devOptions.useFrames.checked = options.useFrames;
      return;
    }
    this.model.devOptions.useFrames.checked = value === 'true';
  }

  navigateToNativeIntegrationPage = () => {
    this.navigateToPageTag("native")
  }
}
