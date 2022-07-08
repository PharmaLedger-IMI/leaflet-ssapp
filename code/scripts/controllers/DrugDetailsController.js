import constants from "../../constants.js";
import videoSourceUtils from "../utils/VideoSourceUtils.js";

const {WebcController} = WebCardinal.controllers;
const gtinResolver = require("gtin-resolver");
const utils = gtinResolver.utils;
const XMLDisplayService = gtinResolver.XMLDisplayService;


export default class DrugDetailsController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.initModel(history);

    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }


      this.smpcDisplayService = await XMLDisplayService.init(element, this.gtinSSI, this.model, "smpc");
      this.leafletDisplayService = await XMLDisplayService.init(element, this.gtinSSI, this.model, "leaflet");
      this.addEventListeners();

      this.model.hasMoreDocTypes = this.model.showSmpc;

      this.model.preferredDocType = "leaflet";

      await this.showEpi(this.leafletDisplayService, this.smpcDisplayService);

      this.model.showLeafletOptions = this.model.showACDCAuthLink || this.model.hasMoreDocTypes || this.model.twoOrMoreLanguages;

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

  async showEpi(leafletService, smpcService) {
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

    if (!this.model.documentLanguages) {
      this.model.documentLanguages = await $$.promisify(this.documentService.getAvailableLanguagesForXmlType.bind(this.documentService))();
    }

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

    //if epi has language that match preferred lang else provide exiting
    let documentLanguage = this.model.documentLanguages.find((item) => item.value === this.model.preferredLanguage) || this.model.documentLanguages[0];

    await $$.promisify(this.renderLeafletHtml, this)(documentLanguage.value)

    this.getVideoSource();
  }

  renderLeafletHtml(language, callback) {
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

  initModel(history) {
    this.model = {
      statusMessage: constants.SN_OK_MESSAGE,
      showSmpc: false,
      showLeaflet: false,
      searchbarStatus: "hidden",
      showScrollToTop: false,
      displayStatus: false,
      preferredDocType: "",
      twoOrMoreLanguages: false,
      showLeafletOptions: false,
      documentLanguages: [],
    };

    let record = history.location.state.productData;

    this.gtinSSI = record.gtinSSI;
    this.gs1Fields = record.gs1Fields;
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
    this.model.documentLanguages = history.location.state.availableLanguages;
    this.model.acdc = record.acdc;
    this.model.showACDCAuthLink = !!this.model.batch.acdcAuthFeatureSSI;
    this.model.displayStatus = this.model.statusMessage !== constants.SN_OK_MESSAGE
  }

  docTypesHandler = async (event) => {
    this.querySelector("#leaflet-content").innerHTML = `<leaflet-spinner></leaflet-spinner>`;
    this.model.preferredDocType = event.detail.value;
    this.model.documentLanguages = null;
    await this.showEpi(this.leafletDisplayService, this.smpcDisplayService);
    this.updateOptions();
  }

  langSelectHandler = async (event) => {
    this.querySelector("#leaflet-content").innerHTML = `<leaflet-spinner></leaflet-spinner>`;
    this.model.preferredLanguage = event.detail.value;
    this.getVideoSource();
    await $$.promisify(this.renderLeafletHtml, this)(this.model.preferredLanguage);
    this.updateOptions();
  }

  updateOptions() {
    if (this.model.twoOrMoreLanguages) {
      this.querySelector('.select-document-language-container').removeAttribute('hidden');
      this.querySelector('.select-document-language').removeEventListener("ionChange", this.langSelectHandler);
      this.querySelector('.select-document-language').addEventListener("ionChange", this.langSelectHandler);
    } else {
      this.querySelector('.select-document-language-container').setAttribute('hidden', true);
    }

    if (this.model.hasMoreDocTypes) {
      this.querySelector('.select-document-type-container').removeAttribute('hidden');
      this.querySelector('.select-document-type').removeEventListener("ionChange", this.docTypesHandler);
      this.querySelector('.select-document-type').addEventListener("ionChange", this.docTypesHandler);
    }


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

    this.onTagClick("go-back", () => {
      this.navigateToPageTag("home");
    })

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
      try {
        this.model.searchbarStatus = "visible";
        const searchbar = this.querySelector('ion-searchbar');
        searchbar.addEventListener('keyup', searchHandler);
        searchbar.querySelector("input").addEventListener('input', searchHandler);
        searchbar.addEventListener('touchend', searchHandler);
      } catch (e) {
        console.log("Error on do-search event", e);
      }

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

    this.onTagClick("toggle-leaflet-options", () => {
      this.querySelector(".leaflet-options-container").classList.toggle("opened");
      this.querySelector(".leaflet-options-wrapper").classList.toggle("show-leaflet-options");
      this.updateOptions();
    })
  }
}
