import constants from "../../constants.js";
import BatchStatusService from "../services/BatchStatusService.js";
import SettingsService from "../services/SettingsService.js";
import videoSourceUtils from "../utils/VideoSourceUtils.js";
import recordUtils from "../../utils.js"

const {WebcController} = WebCardinal.controllers;
const gtinResolver = require("gtin-resolver");
const utils = gtinResolver.utils;
const XMLDisplayService = gtinResolver.XMLDisplayService;
const LeafletInfoService = gtinResolver.LeafletInfoService;


export default class DrugDetailsController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.model = {
      serialNumberLabel: constants.SN_LABEL,
      statusMessage: constants.SN_OK_MESSAGE,
      serialNumber: "",
      showSmpc: false,
      showLeaflet: false,
      searchbarStatus: "hidden",
      showScrollToTop: false,
      epiColumns: 0,
      displayStatus: false,
      selectUserType: false,
      preferredDocType: "",
      twoOrMoreLanguages: false,
      showLeafletOptions: false,
      documentLanguages: [],
      acdc: history.location.state.acdc
    };

    this.model.loadingData = this.model.showEPI === undefined;
    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }
      this.enclaveDB = enclaveDB;
      enclaveDB.getRecord(constants.HISTORY_TABLE, history.location.state.productData, async (err, record) => {
        if (err) {
          console.log("Undefined product data");
          this.updateUIInGTINOnlyCase()
          this.showModal(this.translate("undefined_data"), this.translate("note"), () => {
          }, () => {
          }, {
            disableExpanding: true, disableFooter: true
          });
          return
        }
        record = await recordUtils.updateRecordData(this.enclaveDB, record);
        this.gtinSSI = record.gtinSSI;
        this.gs1Fields = record.gs1Fields;
        this.model.serialNumber = this.gs1Fields.serialNumber === "0" ? "-" : this.gs1Fields.serialNumber;
        this.model.gtin = this.gs1Fields.gtin;
        this.model.batchNumber = this.gs1Fields.batchNumber;
        this.model.expiryForDisplay = record.expiryForDisplay
        this.model.expiryTime = record.expiryTime;
        this.model.product = record.product;
        this.model.batch = record.batch || {};
        this.model.statusType = record.statusType;
        this.model.status = record.status;
        this.model.statusMessage = this.translate(record.statusMessage);
        this.model.snCheck = record.snCheck;
        this.networkName = record.networkName;
        this.model.showVideoLink = false;
        this.model.preferredLanguage = history.location.state.preferredLanguage;
        this.acdc = history.location.state.acdc;
        this.model.showACDCAuthLink = !!this.model.batch.acdcAuthFeatureSSI;

        this.smpcDisplayService = await XMLDisplayService.init(element, this.gtinSSI, this.model, "smpc");
        this.leafletDisplayService = await XMLDisplayService.init(element, this.gtinSSI, this.model, "leaflet");
        this.leafletInfoService = await LeafletInfoService.init(record.gs1Fields, record.networkName);
        this.addEventListeners();
        this.settingsService = new SettingsService(enclaveDB);

        this.model.hasMoreDocTypes = this.model.showSmpc && this.model.showLeaflet;
        this.model.preferredDocType = await this.settingsService.asyncReadSetting("preferredDocType");

        //first time select preferred document type to display
        if (!this.model.preferredDocType && this.model.hasMoreDocTypes) {
          /*          //display preferred user type select for document view
                    let modal = this.showModalFromTemplate('user-type-select', () => {
                    }, () => {
                    }, {
                      model: {
                        title: this.translate("user_type_title"),
                        "user_type_1": this.translate("user_type_1"),
                        "user_type_1_description": this.translate("user_type_1_description"),
                        "user_type_2": this.translate("user_type_2"),
                        "user_type_2_description": this.translate("user_type_2_description"),
                      }, disableExpanding: true, disableFooter: true, disableClosing: true
                    });
                    modal.addEventListener("initialised", () => {
                      this.onTagClick("select-user-type", async (model, target) => {
                        this.model.preferredDocType = target.getAttribute("preferredDocType");
                        this.settingsService.writeSetting("preferredDocType", this.model.preferredDocType, async () => {
                          modal.destroy();
                          await this.init();
                        })

                      })
                    })*/
          this.model.preferredDocType = "leaflet";
        }
        await this.init()

      })

    })
  }

  getVideoSource() {
    let documentType = this.model.preferredDocType || "leaflet";

    if (this.model.product.videos && this.model.product.videos["defaultSource"]) {
      this.model.videoSource = this.model.product.videos["defaultSource"];
    }
    if (this.model.batch.videos && this.model.batch.videos["defaultSource"]) {
      this.model.videoSource = this.model.batch.videos["defaultSource"];
    }
    if (this.model.product.videos && this.model.product.videos[`${documentType}/${this.model.preferredLanguage}`]) {
      this.model.videoSource = this.model.product.videos[`${documentType}/${this.model.preferredLanguage}`]
    }
    if (this.model.batch.videos && this.model.batch.videos[`${documentType}/${this.model.preferredLanguage}`]) {
      this.model.videoSource = this.model.batch.videos[`${documentType}/${this.model.preferredLanguage}`]
    }
    this.model.showVideoLink = !!this.model.videoSource;

    if (this.model.showVideoLink) {
      this.model.videoSourceHtml = {html: videoSourceUtils.getEmbeddedVideo(this.model.videoSource)}
    }
  }

  async init() {
    await this.selectServiceType(this.leafletDisplayService, this.smpcDisplayService);
    this.model.showLeafletOptions = this.model.showACDCAuthLink || this.model.hasMoreDocTypes || this.model.twoOrMoreLanguages;
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
    if (!this.model.documentLanguages || this.model.documentLanguages.length === 0) {
      this.showModalFromTemplate('error-message', () => {
      }, () => {
        this.navigateToPageTag("home")
      }, {
        model: {
          title: this.translate("note"), messageText: this.translate("no_leaflet")
        }, disableExpanding: true, disableFooter: true
      });
      return;
    }

    this.model.twoOrMoreLanguages = this.model.documentLanguages.length >= 2;

    let documentLanguage;
    if (this.model.twoOrMoreLanguages) {
      documentLanguage = this.model.documentLanguages.find((item) => item.value === this.model.preferredLanguage);
    } else {
      documentLanguage = this.model.documentLanguages[0];
    }
    if (documentLanguage) {
      if (this.model.preferredLanguage !== documentLanguage.value) {
        this.model.preferredLanguage = documentLanguage.value;
      }
      await this.renderEpi();
    } else {
      //display language select
      let modal = this.showModalFromTemplate('document-language-select', () => {
      }, () => {
      }, {
        model: {
          languages: this.model.documentLanguages,
          language_select_title: this.translate("language_select_title"),
          language_select_description: this.translate("language_select_description"),
        }, disableExpanding: true, disableFooter: true, disableClosing: true
      });
      modal.addEventListener("initialised", () => {
        modal.querySelector("ion-select").addEventListener("ionChange", async (evt) => {
          modal.destroy();
          this.model.preferredLanguage = evt.detail.value;
          await this.renderEpi();
        });
      })
    }
    this.getVideoSource();
  }

  renderLeafletHtml(language, callback) {
    if (this.model.showEPI) {
      this.documentService.displayXmlForLanguage(language, (err) => {
        if (err) {
          return callback(err);
        }
        this.querySelector(".leaflet-wrapper").addEventListener('scroll', (evt) => {
          this.model.showScrollToTop = evt.target.scrollTop > 50;
        })

        this.setAccordionHandlers(true);
        return callback()
      });
    }
    return callback();
  }

  setAccordionHandlers(init) {
    let accordionItems = document.querySelectorAll("div.leaflet-accordion-item");
    let eventHandler = (evt) => {
      evt.target.classList.toggle("active");
    };

    accordionItems.forEach((accItem, index) => {
      if (index === 0 && init) {
        accItem.classList.toggle("active");
      }
      accItem.removeEventListener("click", eventHandler);
      accItem.addEventListener("click", eventHandler);

    })
  }

  async renderEpi() {
    if (!this.model.batch || Object.keys(this.model.batch).length === 0) {
      this.updateUIInGTINOnlyCase();
      this.showModal(this.translate("batch_not_found"), this.translate("note"), () => {
      }, () => {
      }, {
        disableExpanding: true, disableFooter: true
      });
      if (this.model.product.gtin && this.model.product.showEPIOnUnknownBatchNumber) {
        this.model.showEPI = true;
      } else {
        this.model.showEPI = false;
      }
    } else {
      /*      if (this.model.batch.defaultMessage || this.model.batch.recalled) {
              this.showModalFromTemplate('batch-info-message', () => {
              }, () => {
              }, {
                model: {
                  title: this.translate("note"),
                  recallMessage: this.model.batch.recalled ? this.model.batch.recalledMessage : "",
                  defaultMessage: this.model.batch.defaultMessage
                }, disableExpanding: true, disableFooter: true
              });
            }*/
      let expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(this.model.batch.expiry);
      if (expiryForDisplay.slice(0, 2) === "00") {
        expiryForDisplay = expiryForDisplay.slice(5);
      }
      let expiryCheck = this.model.expiryForDisplay === expiryForDisplay;

      const currentTime = Date.now();
      this.model.showEPI = this.leafletInfoService.leafletShouldBeDisplayed(this.model, expiryCheck, currentTime);
    }
    await $$.promisify(this.renderLeafletHtml, this)(this.model.preferredLanguage)
    this.model.displayStatus = this.model.statusMessage !== constants.SN_OK_MESSAGE

  }

  updateUIInGTINOnlyCase() {
    let batchStatusService = new BatchStatusService();
    batchStatusService.unableToVerify();
    this.model.statusMessage = batchStatusService.statusMessage;
    this.model.statusType = batchStatusService.statusType;
    this.model.packageVerification = constants.PACK_VERIFICATION_UNABLE_TO_VERIFY_MESSAGE;
  }

  addEventListeners() {

    if ((!this.acdc || !this.acdc.authResponse) && !!this.model.batch.acdcAuthFeatureSSI) {
      this.onTagClick('auth-feature', () => {
        if (!this.model.batch || !this.model.batch.acdcAuthFeatureSSI) {
          return this.showErrorModal(`Could not find and Authentication Feature`, "Anti Counterfeiting");
        }
        this.showModalFromTemplate('acdc-ssapp-modal', () => {
        }, () => {
        }, {
          model: {
            title: this.translate("verify_package"),
            ssi: this.model.batch.acdcAuthFeatureSSI,
            gtinSSI: this.gtinSSI,
            gs1Fields: this.gs1Fields,
            networkName: this.networkName,
            acdc: this.model.acdc
          },
          disableExpanding: true,
          disableFooter: true
        });
      });
    } else if (this.acdc && this.acdc.authResponse) {
      const {status, error} = this.acdc.authResponse;
      this.model.packageVerification = status ? this.translate("verified") : `${this.translate("invalid")}${error.message ? `\n${error.message}` : ''}`;
    }

    this.model.onChange('showEPI', async (...props) => {
      this.model.loadingData = this.model.showEPI === undefined;

    });

    this.onTagClick("go-back", () => {
      this.navigateToPageTag("home");
    })

    this.onTagClick("show-video", () => {
      this.showModalFromTemplate('product-video', () => {
      }, () => {
      }, {
        model: {
          title: this.model.product.name + " - video",
          videoSource: {html: videoSourceUtils.getEmbeddedVideo(this.model.videoSource)},
        }, disableFooter: true, disableExpanding: true,
      });
    });

    let searchHandler = (event) => {
      if (event.key === "Enter") {
        const query = event.target.value.toLowerCase().trim();
        //clear all highlights
        this.documentService.searchInHtml(query);
        //search removes listeners by replacing inner html
        this.setAccordionHandlers();
      }
    }

    this.onTagClick("do-search", async () => {
      this.model.searchbarStatus = "visible";
      const searchbar = this.querySelector('ion-searchbar');
      searchbar.addEventListener('keyup', searchHandler);
      // searchbar.addEventListener('keyup', searchHandler);
    })

    this.onTagClick("close-search", () => {
      const searchbar = this.querySelector('ion-searchbar');
      searchbar.removeEventListener('keyup', searchHandler);
      this.model.searchbarStatus = "hidden";
    })

    this.onTagClick("scroll-top", () => {
      this.querySelector(".leaflet-wrapper").scrollTo(0, 0);
    })

    let docTypesHandler = async (event) => {
      this.model.preferredDocType = event.detail.value;
      await this.selectServiceType(this.leafletDisplayService, this.smpcDisplayService);
    }
    let langSelectHandler = async (event) => {
      this.model.preferredLanguage = event.detail.value;
      this.getVideoSource();
      this.renderEpi();
      /*if (this.model.showEPI) {
        this.documentService.displayXmlForLanguage(this.model.preferredLanguage);
      }*/
    }
    this.onTagClick("toggle-leaflet-options", () => {
      this.querySelector(".leaflet-options-container").classList.toggle("opened");
      this.querySelector(".leaflet-options-wrapper").classList.toggle("show-leaflet-options")
      if (this.model.hasMoreDocTypes) {
        this.querySelector('.select-document-type-container').removeAttribute('hidden');
        this.querySelector('.select-document-type').removeEventListener("ionChange", docTypesHandler);
        this.querySelector('.select-document-type').addEventListener("ionChange", docTypesHandler);
      } else {
        this.querySelector('.select-document-type-container').setAttribute('hidden', true);
      }
      if (this.model.twoOrMoreLanguages) {
        this.querySelector('.select-document-language-container').removeAttribute('hidden');
        this.querySelector('.select-document-language').removeEventListener("ionChange", langSelectHandler);
        this.querySelector('.select-document-language').addEventListener("ionChange", langSelectHandler);
      } else {
        this.querySelector('.select-document-language-container').setAttribute('hidden', true);
      }

    })
  }
}
