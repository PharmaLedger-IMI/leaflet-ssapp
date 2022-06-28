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
    try {
      dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
        if (err) {
          console.log('Error on getting enclave DB');
          throw err;
          return;
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

        this.documentService = await XMLDisplayService.init(element, record.gtinSSI, this.model, "leaflet");
        if (!this.model.preferredLanguage) {
          this.model.preferredLanguage = await this.settingsService.asyncReadSetting("preferredLanguage");
        }
        this.model.documentLanguages = await $$.promisify(this.documentService.getAvailableLanguagesForXmlType.bind(this.documentService))();
        if (!this.model.documentLanguages || this.model.documentLanguages.length === 0) {
          throw new Error("No available language for leaflet");
        }

        let documentLanguage = this.model.documentLanguages.find((item) => item.value === this.model.preferredLanguage);
        if (documentLanguage) {
          if (!this.model.batch || Object.keys(this.model.batch).length === 0) {
            this.updateUIInGTINOnlyCase();
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

          this.showPopup(this.getModalConfig(this.model.status));
          //show modal cu status

        } else {
          let langContent = `<div class="language-text">${this.translate("language_select_message")}</div>`;
          this.model.documentLanguages.forEach((lang, index) => {
            let langRadio = `<div class="language-radio-item">
                                <label for="${lang.value}"> ${lang.label} - (${lang.nativeName})</label> 
                                <input type="radio" name="languages" ${index === 0 ? "checked" : ""} value="${lang.value}" id="${lang.value}"></div>`;
            langContent = langContent + langRadio;
          })
          this.showPopup({
            status: "language-select",
            statusMessage: this.translate("language_select_status"),
            title: this.translate("language_select_title"),
            content: {html: langContent},
            mainAction: "lang-proceed",
            mainActionLabel: this.translate("lang_proceed"),
            secondaryAction: "go-home",
            secondaryActionLabel: this.translate("back_home")
          });
        }
        this.addListeners();
      })
    } catch (err) {
      this.showPopup(this.getModalConfig("invalid_data"))

    }
  }

  addListeners() {
    this.onTagClick("go-home", () => {
      this.navigateToPageTag("home");
    });

    this.onTagClick("scan-again", () => {
      this.navigateToPageTag("scan");
    })

    this.onTagClick("lang-proceed", async () => {
      let lang = this.querySelector("input[name='languages']:checked").value
      await this.settingsService.asyncWriteSetting("preferredLanguage", lang)
      this.navigateToPageTag("drug-details", {productData: this.recordPk});
    })

    this.onTagClick("view-leaflet", () => {
      this.navigateToPageTag("drug-details", {productData: this.recordPk});
    })
  }

  showPopup(config) {
    this.showModalFromTemplate('drug-summary-modal', () => {
    }, () => {
      this.navigateToPageTag("home")
    }, {model: config, disableExpanding: true, disableFooter: true});
  }

  getModalConfig(status) {
    let configObj = {status: status};

    if (this.model.showEPI) {
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

    switch (this.model.status) {
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
        configObj.content = this.translate("invalid_data_message");
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