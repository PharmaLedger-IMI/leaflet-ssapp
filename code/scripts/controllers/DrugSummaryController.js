import constants from "../../constants.js";
import recordUtils from "../../utils.js";
import SettingsService from "../services/SettingsService.js";

const {WebcController} = WebCardinal.controllers;
const gtinResolver = require("gtin-resolver");
const utils = gtinResolver.utils;
const XMLDisplayService = gtinResolver.XMLDisplayService;
const LeafletInfoService = gtinResolver.LeafletInfoService;

export default class DrugSummaryController extends WebcController {
  constructor(element, history) {
    super(element, history);

    this.model = {
      serialNumberLabel: constants.SN_LABEL,
      statusMessage: constants.SN_OK_MESSAGE,
      serialNumber: "",
      preferredDocType: "leaflet",
    };
    let dbApi = require("opendsu").loadApi("db");

    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      try {
        if (history.location.state.scanErrorData) {
          throw new Error("ScanError");
        }
        if (err) {
          console.log('Error on getting enclave DB');
          this.showPopup(this.getModalConfig("invalid_data", err));
        }
        this.settingsService = new SettingsService(enclaveDB);
        let record = await $$.promisify(enclaveDB.getRecord)(constants.HISTORY_TABLE, history.location.state.productData);
        record = await recordUtils.updateRecordData(enclaveDB, record);

        this.leafletInfoService = await LeafletInfoService.init(record.gs1Fields, record.networkName);

        this.model.expiryForDisplay = record.expiryForDisplay
        this.model.expiryTime = record.expiryTime;
        this.model.product = record.product;
        this.model.batch = record.batch || {};
        this.model.statusType = record.statusType;
        this.model.status = record.status;
        this.model.statusMessage = this.translate(record.statusMessage);
        this.model.snCheck = record.snCheck;
        this.recordPk = record.pk;

        // check if gtin only case
        if (!this.model.batch || Object.keys(this.model.batch).length === 0) {
          if (this.model.product.gtin && this.model.product.showEPIOnUnknownBatchNumber) {
            this.model.showEPI = true;
          } else {
            this.model.showEPI = false;
          }
        } else {
          let expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(this.model.batch.expiry);
          if (expiryForDisplay.slice(0, 2) === "00") {
            expiryForDisplay = expiryForDisplay.slice(5);
          }
          let expiryCheck = this.model.expiryForDisplay === expiryForDisplay;

          const currentTime = Date.now();
          this.model.showEPI = this.leafletInfoService.leafletShouldBeDisplayed(this.model, expiryCheck, currentTime);

        }

        this.documentService = await XMLDisplayService.init(element, record.gtinSSI, this.model, "leaflet");
        if (!this.model.preferredLanguage) {
          this.model.preferredLanguage = await this.settingsService.asyncReadSetting("preferredLanguage");
        }
        this.availableLanguages = await $$.promisify(this.documentService.getAvailableLanguagesForXmlType.bind(this.documentService))();
        if (!this.availableLanguages || this.availableLanguages.length === 0) {
          throw new Error("No available language for leaflet");
        }

        this.documentLanguage = this.availableLanguages.find((item) => item.value === this.model.preferredLanguage);

        this.showPopup(this.getModalConfig(this.model.status));
      } catch (err) {
        let errData = err.message === "ScanError" ? history.location.state.scanErrorData : err;
        this.showPopup(this.getModalConfig("invalid_data", errData));
      }
    })
    this.addListeners();
  }

  addListeners() {
    this.onTagClick("go-home", () => {
      this.modalWindow.destroy();
      this.navigateToPageTag("home");
    });

    this.onTagClick("scan-again", () => {
      this.modalWindow.destroy();
      this.navigateToPageTag("scan");
    })

    this.onTagClick("lang-proceed", async () => {
      this.modalWindow.destroy();
      let lang = this.querySelector("input[name='languages']:checked").value
      this.navigateToPageTag("drug-details", {productData: this.recordPk, preferredLanguage: lang});
    })

    this.onTagClick("view-leaflet", () => {
      this.modalWindow.destroy();
      this.navigateToPageTag("drug-details", {productData: this.recordPk});
    })
  }

  showPopup(config) {
    this.modalWindow = this.showModalFromTemplate('drug-summary-modal', () => {
    }, () => {
      this.navigateToPageTag("home")
    }, {model: config, disableExpanding: true, disableFooter: true});
  }

  getLanguageConfig() {
    let configObj = {
      status: "language-select",
      statusMessage: this.translate("language_select_status"),
      title: this.translate("language_select_title"),
    }

    if (this.availableLanguages.length >= 1) {
      let langContent = `<div class="language-text">${this.translate("language_select_message")}</div>`;
      this.availableLanguages.forEach((lang, index) => {
        let langRadio = `<div class="language-radio-item">
                                <label> ${lang.label} - (${lang.nativeName})
                                <input type="radio" name="languages" ${index === 0 ? "checked" : ""} value="${lang.value}" id="${lang.value}">
                                </label> </div>`;
        langContent = langContent + langRadio;
      })
      configObj.mainAction = "lang-proceed";
      configObj.mainActionLabel = this.translate("lang_proceed");
      configObj.secondaryAction = "go-home";
      configObj.secondaryActionLabel = this.translate("back_home");
      configObj.content = {html: langContent};
    } else {
      let noLangContent = `<div class="language-text">${this.translate("no_language_select_message")}</div>`;
      configObj.mainAction = "go-home";
      configObj.mainActionLabel = this.translate("back_home");
      configObj.secondaryAction = "scan-again";
      configObj.secondaryActionLabel = this.translate("scan_again");
      configObj.content = {html: noLangContent};
    }

    return configObj;
  }

  getModalConfig(status, additionaData) {
    let configObj = {status: status};

    if (this.model.showEPI) {
      if (!this.documentLanguage) {
        return this.getLanguageConfig();
      }
      configObj.mainAction = "view-leaflet";
      configObj.mainActionLabel = this.translate("view_leaflet");
      configObj.secondaryAction = "scan-again";
      configObj.secondaryActionLabel = this.translate("scan_again");

    } else {
      configObj.mainAction = "scan-again";
      configObj.mainActionLabel = this.translate("scan_again");
      configObj.secondaryAction = "go-home";
      configObj.secondaryActionLabel = this.translate("back_home");
    }


    switch (status) {
      case "verified":
        configObj.statusMessage = this.translate("verified_status");
        configObj.title = this.model.product.name;
        configObj.subtitle = this.model.product.description;
        configObj.content = this.translate("verified_status_message");
        break;
      case "invalid_sn":
        configObj.statusMessage = this.translate("invalid_sn_status");
        configObj.title = this.translate("invalid_sn_title");
        configObj.content = this.translate("invalid_sn_status_message");
        break;
      case "incorrect_date":
        configObj.statusMessage = this.translate("incorrect_date_status");
        configObj.title = this.translate("incorrect_date_title");
        configObj.content = this.translate("incorrect_date_status_message");
        break;
      case "expired_date":
        configObj.statusMessage = this.translate("expired_date_status");
        configObj.title = this.model.product.name;
        configObj.subtitle = this.model.product.description;
        configObj.content = this.translate("expired_date_message");
        break;
      case "invalid_data":
        configObj.statusMessage = this.translate("invalid_data_status");
        configObj.title = this.translate("invalid_data_title");
        let objContentHrml = `${this.translate("invalid_data_message")} <div>${additionaData.message}</div>`;

        if (additionaData.fields && Object.keys(additionaData.fields).length > 0) {
          let gs1Values = Object.values(additionaData.fields);
          objContentHrml = `${objContentHrml}<br> <div>
                                                 <div class="label">${this.translate("gs1field_sn")} ${gs1Values[0]}</div>
                                                 <div class="label">${this.translate("gs1field_gtin")} ${gs1Values[1]}</div>
                                                 <div class="label">${this.translate("gs1field_batch")} ${gs1Values[2]}</div>
                                                 <div class="label">${this.translate("gs1field_date")} ${gs1Values[3]}</div>
                                             </div>`
        }

        if (additionaData.secondaryMessage) {
          objContentHrml = `${objContentHrml} <br><br><div>**${additionaData.secondaryMessage}</div>`
        }

        configObj.content = objContentHrml;
        break;
      case "recalled_batch":
        configObj.statusMessage = this.translate("recalled_batch_status");
        configObj.title = this.translate("recalled_batch_title");
        configObj.content = this.translate("recalled_batch_status_message");
        break;
      case "recalled_sn":
        configObj.statusMessage = this.translate("recalled_sn_status");
        configObj.title = this.translate("recalled_sn_title");
        configObj.content = this.translate("recalled_sn_status_message");
        break;
      case "decommissioned_sn":
        configObj.statusMessage = this.translate("decommissioned_sn_status");
        configObj.title = this.translate("decommissioned_sn_title");
        configObj.content = this.translate("decommissioned_sn_status_message");
        break;
    }

    let objContentHrml = `<div>${configObj.content}</div>`;

    if (this.model.batch && this.model.batch.defaultMessage) {
      objContentHrml = `${objContentHrml} <div>${this.model.batch.defaultMessage}</div>`
    }

    if (this.model.batch && this.model.batch.recalled && this.model.batch.recalledMessage) {
      objContentHrml = `${objContentHrml} <div>${this.model.batch.recalledMessage}</div>`
    }

    configObj.content = {html: `<div>${objContentHrml}</div>`};
    return configObj;
  }

}