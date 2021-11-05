const {WebcController} = WebCardinal.controllers;
import SettingsService from "../services/SettingsService.js";
import constants from "../../constants.js";
import appLanguages from "../../appLanguages.js";

export default class SettingsController extends WebcController {
  constructor(element, history) {
    super(element, history);

    this.setModel({
      languageSelectorOpened: false,
      origin: window.location.origin,
      networkEditMode: true,
      scanditLicenseEditMode: true,
      refreshPeriodEditMode: true,
      networkName: {value: constants.DEFAULT_NETWORK_NAME},
      advancedUser: false,
      refreshPeriod: {value: constants.DEFAULT_REFRESH_PERIOD},
      scanditLicense: {value: ""},
      appLanguages: appLanguages
    });
    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }
      this.settingsService = new SettingsService(enclaveDB);

      this.model.preferredLanguage = await this.settingsService.asyncReadSetting("preferredLanguage");
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

      this.querySelector("ion-select").addEventListener("ionChange", (ev) => {
        this.model.preferredLanguage = ev.detail.value;
        this.settingsService.writeSetting("preferredLanguage", ev.detail.value, (err) => {
          if (err) {
            console.log(err);
            return;
          }
          this.applySkinForCurrentPage(this.model.preferredLanguage);
          this.setSkin(this.model.preferredLanguage);
        })
      });

      this.querySelector("ion-checkbox").addEventListener("ionChange", (ev) => {
        this.model.advancedUser = ev.detail.checked;
        this.settingsService.writeSetting("advancedUser", ev.detail.checked, (err) => {
          if (err) {
            console.log(err);
            return;
          }
        })
      });

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

  }

  toggleEditMode(prop) {
    this.model[prop] = !this.model[prop]
  }

}
