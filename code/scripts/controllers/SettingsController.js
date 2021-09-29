const {WebcController} = WebCardinal.controllers;

import SettingsService from "../services/SettingsService.js";
import constants from "../../constants.js";

export default class SettingsController extends WebcController {
  constructor(element, history) {
    super(element, history);

    this.setModel({
      languageSelectorOpened: false,
      origin: window.location.origin,
      networkEditMode: true,
      scanditLicenseEditMode: true
    });


    this.settingsService = new SettingsService(this.DSUStorage);
    this.settingsService.readSetting("advancedUser", (err, advancedUser) => {
      this.model.advancedUser = !!advancedUser;
    });

    this.settingsService.readSetting("preferredLanguage", (err, preferredLanguage) => {
      this.model.preferredLanguage = preferredLanguage;
    });

    this.model.networkNameSetting = {
      label: "",
      value: ""
    };

    this.initNetworkSettingsTab();

    this.onTagClick("change-edit-mode", (model, target, event) => {
      this.toggleEditMode(target.getAttribute("data"));
    })

    this.onTagClick("change-network", (model, target, event) => {
      let newValue = target.parentElement.querySelector("psk-input").value;
      this.model.networkNameSetting.value = newValue
      this.settingsService.writeSetting("networkname", newValue, (err) => {
        if (err) {
          console.log(err);
        }
        this.toggleEditMode("networkEditMode");
      });
    });

    this.onTagClick("change-default-network", (model, target, event) => {
      this.settingsService.writeSetting("networkname", undefined, (err) => {
        if (err) {
          console.log(err);
        }
        this.initNetworkSettingsTab();
        this.toggleEditMode("networkEditMode");
      });
    });

    this.model.languagesToAdd = [{label: "English", value: "en"}, {label: "German", value: "de"}];

    this.querySelector("ion-select").addEventListener("ionChange", (ev) => {
      this.model.preferredLanguage = ev.detail.value;
      this.settingsService.writeSetting("preferredLanguage",ev.detail.value, (err) => {
        if (err) {
          console.log(err);
        }
      })
    })
    this.querySelector("ion-checkbox").addEventListener("ionChange", (ev) => {
      this.model.advancedUser = ev.detail.checked;
      this.settingsService.writeSetting("advancedUser", ev.detail.checked, (err) => {
        if (err) {
          console.log(err);
        }
      })
    })
    // scanning settings
    this.model.useScanditLicense = {label: ""};
    this.initScanningSettingsTab();

    this.onTagClick("set-scandit-license", (model, target, event) => {
      let newValue = target.parentElement.querySelector("psk-input").value;
      this.model.useScanditLicense.value = newValue;
      this.settingsService.writeSetting("scanditlicense", newValue, (err) => {
        if (err) {
          console.log(err);
        }
        this.toggleEditMode("scanditLicenseEditMode");
      });
    });
  }

  toggleEditMode(prop) {
    this.model[prop] = !this.model[prop]
  }

  initNetworkSettingsTab() {
    this.settingsService.readSetting("networkname", (err, networkname) => {
      if (err || typeof networkname === "undefined") {
        this.settingsService.writeSetting("networkname", constants.DEFAULT_NETWORK_NAME, (err) => {
          if (err) {
            return console.log("Unable to write setting networkname");
          }
          this.model.networkNameSetting.value = constants.DEFAULT_NETWORK_NAME;
        });
      }

      this.model.networkNameSetting.value = networkname;
    });
  }

  initScanningSettingsTab() {
    this.settingsService.readSetting("scanditlicense", (err, scanditlicense) => {
      if (err || typeof scanditlicense === "undefined") {
        this.settingsService.writeSetting("scanditlicense", "", (err) => {
          if (err) {
            return console.log("Unable to write setting scanditlicense");
          }
          this.model.useScanditLicense.value = "";
        });
      }

      this.model.useScanditLicense.value = scanditlicense;
    });
  }
}
