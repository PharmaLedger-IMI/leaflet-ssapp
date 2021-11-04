const {WebcController} = WebCardinal.controllers;
import utils from "../../utils.js";
import constants from "../../constants.js";
import XMLDisplayService from "../services/XMLDisplayService/XMLDisplayService.js";
import BatchStatusService from "../services/BatchStatusService.js";
import SettingsService from "../services/SettingsService.js";

export default class DrugDetailsController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.model = {
      serialNumberLabel: constants.SN_LABEL,
      statusMessage: constants.SN_OK_MESSAGE,
      packageVerification: "Action required",
      showVerifyPackageButton: true,
      showReportButton: true,
      showAddToCabinetButton: true,
      serialNumber: "",
      showSmpc: false,
      showLeaflet: false,
      epiColumns: 0,
      displayStatus: false,
      selectUserType: false,
      preferredDocType: "",
      twoOrMoreLanguages: false,
      showEPI: false,
      documentLanguages: []
    };

    if (typeof history.location.state !== "undefined") {
      this.gtinSSI = history.location.state.productData.gtinSSI;
      this.gs1Fields = history.location.state.productData.gs1Fields;
      this.model.serialNumber = this.gs1Fields.serialNumber === "0" ? "-" : this.gs1Fields.serialNumber;
      this.model.gtin = this.gs1Fields.gtin;
      this.model.batchNumber = this.gs1Fields.batchNumber;
      this.model.expiryForDisplay = history.location.state.productData.expiryForDisplay
      this.model.expiryTime = history.location.state.productData.expiryTime;
      this.model.product = history.location.state.productData.product;
      this.model.batch = history.location.state.productData.batch;
      this.model.statusType = history.location.state.productData.statusType;
      this.model.statusMessage = history.location.state.productData.statusMessage;
      this.model.snCheck = history.location.state.productData.snCheck;
    } else {
      console.log("Undefined product data");
      this.updateUIInGTINOnlyCase()
      this.showModal("Undefined product data", "Note", () => {
      }, () => {
      }, {
        disableExpanding: true,
        disableFooter: true
      });
      return
    }
    this.smpcDisplayService = new XMLDisplayService(this.DSUStorage, element, this.gtinSSI, "smpc", "smpc.xml", this.model);
    this.leafletDisplayService = new XMLDisplayService(this.DSUStorage, element, this.gtinSSI, "leaflet", "leaflet.xml", this.model);


    this.model.onChange('showEPI', async (...props) => {
      if (this.model.showEPI) {
        this.querySelector('#leaflet-header').removeAttribute('hidden');
        this.querySelector(".leaflet-shortcuts-container").removeAttribute('hidden');
        const element = WebCardinal.root.querySelector('leaflet-shortcuts')
        await element.attachScrollListeners('webc-app-loader[tag="drug-details"] page-template');
        if (this.model.hasMoreDocTypes) {
          this.querySelector('.select-document-type-container').removeAttribute('hidden');
        } else {
          this.querySelector('.select-document-type-container').setAttribute('hidden', true);
        }
        if (this.model.twoOrMoreLanguages) {
          this.querySelector('.select-document-language-container').removeAttribute('hidden');
        } else {
          this.querySelector('.select-document-language-container').setAttribute('hidden', true);
        }
      } else {
        this.querySelector('#leaflet-header').setAttribute('hidden', true);
        this.querySelector(".leaflet-shortcuts-container").setAttribute('hidden', true);
      }

    });

    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }
      this.dbStorage = enclaveDB;
      this.settingsService = new SettingsService(enclaveDB);

      await this.smpcDisplayService.isXmlAvailable();
      await this.leafletDisplayService.isXmlAvailable();
      this.model.hasMoreDocTypes = this.model.showSmpc && this.model.showLeaflet;
      this.model.preferredDocType = await this.settingsService.asyncReadSetting("preferredDocType");

      //first time select preferred document type to display
      if (!this.model.preferredDocType && this.model.hasMoreDocTypes) {
        //display preferred user type select for document view
        let modal = this.showModalFromTemplate('user-type-select', () => {
        }, () => {
        }, {
          disableExpanding: true,
          disableFooter: true,
          disableClosing: true
        });
        modal.addEventListener("initialised", (ev) => {
          this.onTagClick("select-user-type", async (model, target, event) => {
            this.model.preferredDocType = target.getAttribute("preferredDocType");
            this.settingsService.writeSetting("preferredDocType", this.model.preferredDocType, async (err) => {
              modal.destroy();
              await this.init();
            })

          })
        })

      } else {
        await this.init()
      }


      this.onTagClick("click-verified", () => {
        this.showModalFromTemplate('batch-info', () => {
        }, () => {
        }, {
          model: {
            title: "Batch Info",
            expiryForDisplay: this.model.expiryForDisplay,
            serialNumber: this.model.serialNumber,
            gtin: this.model.gtin,
            batchNumber: this.model.batchNumber
          },
          disableExpanding: true,
          disableFooter: true
        });
      });
    })
  }

  async init() {
    await this.selectServiceType(this.leafletDisplayService, this.smpcDisplayService);
    this.querySelector('.select-document-type').addEventListener("ionChange", async (event) => {
      this.model.preferredDocType = event.detail.value;
      await this.selectServiceType(this.leafletDisplayService, this.smpcDisplayService);
    });

    this.querySelector('.select-document-language').addEventListener("ionChange", async (event) => {
      this.model.preferredLanguage = event.detail.value;
      this.renderEpi();
      if (this.model.showEPI) {
        this.documentService.displayXmlForLanguage(this.model.preferredLanguage);
      }

    });
  }

  async selectServiceType(leafletService, smpcService) {
    switch (this.model.preferredDocType) {
      case "smpc":
        this.documentService = this.model.showSmpc ? smpcService : leafletService;
        break;
      case "leaflet":
        this.documentService = this.model.showLeaflet ? leafletService : smpcService;
        break
      default:
        this.documentService = this.model.showLeaflet ? leafletService : smpcService;
    }

    if (!this.model.preferredLanguage) {
      this.model.preferredLanguage = await this.settingsService.asyncReadSetting("preferredLanguage");
    }

    this.model.documentLanguages = await $$.promisify(this.documentService.getAvailableLanguagesForXmlType.bind(this.documentService))();
    if (!this.model.documentLanguages) {
      this.documentService.displayError();
      return;
    }

    if (this.model.documentLanguages.length >= 2) {
      this.model.twoOrMoreLanguages = true;
    } else {
      this.model.twoOrMoreLanguages = false;
    }

    let documentLanguage;
    if (this.model.twoOrMoreLanguages) {
      documentLanguage = this.model.documentLanguages.find((item) => item.value === this.model.preferredLanguage);
    } else {
      documentLanguage = this.model.documentLanguages[0];
    }
    if (documentLanguage) {
      if (this.model.preferredLanguage !== documentLanguage.value) {
        this.model.preferredLanguage = documentLanguage.value;
      } else {
        this.renderEpi();
        if (this.model.showEPI) {
          this.documentService.displayXmlForLanguage(documentLanguage.value);
        }

      }
    } else {
      //display language select
      let modal = this.showModalFromTemplate('document-language-select', () => {
      }, () => {
      }, {
        model: {languages: this.model.documentLanguages},
        disableExpanding: true,
        disableFooter: true,
        disableClosing: true
      });
      modal.addEventListener("initialised", () => {
        modal.querySelector("ion-select").addEventListener("ionChange", (evt) => {
          modal.destroy();
          this.model.preferredLanguage = evt.detail.value;
          this.renderEpi();
          if (this.model.showEPI) {
            this.documentService.displayXmlForLanguage(evt.detail.value);
          }
        });
      })


    }
  }

  renderEpi() {
    if (typeof this.model.batch === "undefined") {
      this.updateUIInGTINOnlyCase();
      this.showModal("The batch number in the barcode could not be found", "Note", () => {
      }, () => {
      }, {
        disableExpanding: true,
        disableFooter: true
      });
      if (this.model.product.gtin && this.model.product.showEPIOnUnknownBatchNumber) {
        this.model.showEPI = true;
      }
    } else {
      if (this.model.batch.defaultMessage || this.model.batch.recalled) {
        this.showModalFromTemplate('batch-info-message', () => {
        }, () => {
        }, {
          model: {
            title: "Note",
            recallMessage: this.model.batch.recalled ? this.model.batch.recalledMessage : "",
            defaultMessage: this.model.batch.defaultMessage
          },
          disableExpanding: true,
          disableFooter: true
        });
      }
      let expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(this.model.batch.expiry);
      if (expiryForDisplay.slice(0, 2) === "00") {
        expiryForDisplay = expiryForDisplay.slice(5);
      }
      let expiryCheck = this.model.expiryForDisplay === expiryForDisplay;

      const currentTime = Date.now();
      this.model.showEPI = this.leafletShouldBeDisplayed(this.model.product, this.model.batch, this.model.snCheck, expiryCheck, currentTime, this.model.expiryTime);
    }

    if (this.model.statusMessage !== constants.SN_OK_MESSAGE) {
      this.model.displayStatus = true;
    } else {
      this.model.displayStatus = false;
    }

  }

  updateUIInGTINOnlyCase() {
    let batchStatusService = new BatchStatusService();
    batchStatusService.unableToVerify();
    this.model.statusMessage = batchStatusService.statusMessage;
    this.model.statusType = batchStatusService.statusType;
    this.model.packageVerification = constants.PACK_VERIFICATION_UNABLE_TO_VERIFY_MESSAGE;
  }

  leafletShouldBeDisplayed(product, batchData, snCheck, expiryCheck, currentTime, expiryTime) {
    //fix for the missing case describe here: https://github.com/PharmaLedger-IMI/epi-workspace/issues/167
    if (batchData.serialCheck && !snCheck.validSerial && !snCheck.recalledSerial && !snCheck.decommissionedSerial && product.showEPIOnSNUnknown) {
      return true;
    }

    if (batchData.serialCheck && typeof this.model.serialNumber === "undefined" && product.showEPIOnSNUnknown) {
      return true;
    }

    if (batchData.serialCheck && snCheck.recalledSerial && (product.showEPIOnBatchRecalled || product.showEPIOnSNRecalled)) {
      return true;
    }

    if (batchData.serialCheck && snCheck.decommissionedSerial && product.showEPIOnSNDecommissioned) {
      return true;
    }

    if (!batchData.expiredDateCheck && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && product.showEPIOnBatchExpired && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.incorrectDateCheck && !expiryCheck && !batchData.serialCheck && product.showEPIOnIncorrectExpiryDate && !batchData.serialCheck) {
      return true;
    }

    if (!batchData.expiredDateCheck && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && product.showEPIOnBatchExpired && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && product.showEPIOnBatchExpired && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial && batchData.recalled && product.showEPIOnBatchRecalled) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial && !batchData.recalled) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && product.showEPIOnBatchExpired && batchData.incorrectDateCheck && expiryCheck
      && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.incorrectDateCheck && !expiryCheck && product.showEPIOnIncorrectExpiryDate && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (!batchData.expiredDateCheck && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (!batchData.expiredDateCheck && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    return false;
  }
}
