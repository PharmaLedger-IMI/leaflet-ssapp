import constants from "../../constants.js";
import BatchStatusService from "../services/BatchStatusService.js";
import SettingsService from "../services/SettingsService.js";
import videoSourceUtils from "../utils/VideoSourceUtils.js";

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
      epiColumns: 0,
      displayStatus: false,
      selectUserType: false,
      preferredDocType: "",
      twoOrMoreLanguages: false,
      documentLanguages: []
    };

    this.model.aboutLabel = this.translate("about")
    this.model.beforeTakingLabel = this.translate("before_taking")
    this.model.howToLabel = this.translate("how_to")
    this.model.sideEffectsLabel = this.translate("side_effects")
    this.model.storingLabel = this.translate("storing")
    this.model.moreLabel = this.translate("more")

    this.model.loadingData = this.model.showEPI === undefined;
    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }
      enclaveDB.getRecord(constants.HISTORY_TABLE, history.location.state.productData, async (err, record) => {
        if (err) {
          console.log("Undefined product data");
          this.updateUIInGTINOnlyCase()
          this.showModal(this.translate("undefined_data"), this.translate("note"), () => {
          }, () => {
          }, {
            disableExpanding: true,
            disableFooter: true
          });
          return
        }
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
          //display preferred user type select for document view
          let modal = this.showModalFromTemplate('user-type-select', () => {
          }, () => {
          }, {
            model: {
              title: this.translate("user_type_title"),
              "user_type_1": this.translate("user_type_1"),
              "user_type_1_description": this.translate("user_type_1_description"),
              "user_type_2": this.translate("user_type_2"),
              "user_type_2_description": this.translate("user_type_2_description"),
            },
            disableExpanding: true,
            disableFooter: true,
            disableClosing: true
          });
          modal.addEventListener("initialised", () => {
            this.onTagClick("select-user-type", async (model, target) => {
              this.model.preferredDocType = target.getAttribute("preferredDocType");
              this.settingsService.writeSetting("preferredDocType", this.model.preferredDocType, async () => {
                modal.destroy();
                await this.init();
              })

            })
          })

        } else {
          await this.init()
        }
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
  }

  async init() {
    await this.selectServiceType(this.leafletDisplayService, this.smpcDisplayService);
    this.querySelector('.select-document-type').addEventListener("ionChange", async (event) => {
      this.model.preferredDocType = event.detail.value;
      await this.selectServiceType(this.leafletDisplayService, this.smpcDisplayService);
    });

    this.querySelector('.select-document-language').addEventListener("ionChange", async (event) => {
      this.model.preferredLanguage = event.detail.value;
      this.getVideoSource();
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
    if (!this.model.documentLanguages || this.model.documentLanguages.length === 0) {
      this.showModalFromTemplate('error-message', () => {
      }, () => {
        this.navigateToPageTag("home")
      }, {
        model: {
          title: this.translate("note"),
          messageText: this.translate("no_leaflet")
        },
        disableExpanding: true,
        disableFooter: true
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
        model: {
          languages: this.model.documentLanguages,
          language_select_title: this.translate("language_select_title"),
          language_select_description: this.translate("language_select_description"),
        },
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
    this.getVideoSource();
  }

  renderEpi() {
    if (!this.model.batch || Object.keys(this.model.batch).length === 0) {
      this.updateUIInGTINOnlyCase();
      this.showModal(this.translate("batch_not_found"), this.translate("note"), () => {
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
            title: this.translate("note"),
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
      this.model.showEPI = this.leafletInfoService.leafletShouldBeDisplayed(this.model, expiryCheck, currentTime);
    }

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
            networkName: this.networkName
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
      if (this.model.showEPI) {
        window.requestAnimationFrame(async () => {
          const element = WebCardinal.root.querySelector('leaflet-shortcuts')
          await element.attachScrollListeners('webc-app-loader[tag="drug-details"] page-template');
        });
        this.querySelector('#leaflet-header').removeAttribute('hidden');
        this.querySelector(".leaflet-shortcuts-container").removeAttribute('hidden');
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

    this.onTagClick("learn-more", (model) => {
      let iconSrc;
      switch (model.statusType.toLowerCase()) {
        case "warning":
          iconSrc = "./assets/icons/recalled.svg";
          break;
        case "error":
          iconSrc = "./assets/icons/error.svg";
          break
      }
      let modalContentMsg = this.translate(`${model.status}_status_message`);
      this.showModalFromTemplate('status-message', () => {
      }, () => {
      }, {
        model: {
          title: model.statusMessage,
          statusType: model.statusType,
          iconSrc: iconSrc,
          messageText: modalContentMsg
        },
        disableExpanding: true,
        disableFooter: true
      });
    });


    this.onTagClick("click-verified", () => {
      let modalTitle = this.translate("info_title");
      let exp_label = this.translate("exp_label");
      let sn_label = this.translate("sn_label");
      let pc_label = this.translate("pc_label");
      let bn_label = this.translate("bn_label");

      this.showModalFromTemplate('batch-info', () => {
      }, () => {
      }, {
        model: {
          title: modalTitle,
          exp_label: exp_label,
          sn_label: sn_label,
          pc_label: pc_label,
          bn_label: bn_label,
          expiryForDisplay: this.model.expiryForDisplay,
          serialNumber: this.model.serialNumber,
          gtin: this.model.gtin,
          batchNumber: this.model.batchNumber
        },
        disableExpanding: true,
        disableFooter: true
      });
    });

    this.onTagClick("show-video", () => {
      this.showModalFromTemplate('product-video', () => {
      }, () => {
      }, {
        model: {
          title: this.model.product.name + " - video",
          videoSource: {html: videoSourceUtils.getEmbeddedVideo(this.model.videoSource)},
        },
        disableFooter: true,
        disableExpanding: true,
      });
    });

    const searchbar = this.querySelector('ion-searchbar');
    searchbar.addEventListener('ionInput', (event) => {
      const query = event.target.value.toLowerCase().trim();
      //clear all highlights
      this.documentService.searchInHtml(query);
    });
  }

}
