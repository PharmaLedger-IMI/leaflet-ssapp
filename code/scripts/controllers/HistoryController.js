const {WebcController} = WebCardinal.controllers;
import constants from "../../constants.js";
import SettingsService from "../services/SettingsService.js";
import BatchStatusService from "../services/BatchStatusService.js";
import DSUDataRetrievalService from "../services/DSUDataRetrievalService/DSUDataRetrievalService.js";
import utils from "../../utils.js";

export default class HistoryController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.model = {products: [], itemsOnPage: 4};
    this.model.settingsService = new SettingsService(this.DSUStorage);

    let self = this;
    this.model.settingsService.readSetting("refreshPeriod", (err, refreshPeriod) => {
      if (err || !refreshPeriod) {
        refreshPeriod = constants.DEFAULT_REFRESH_PERIOD;
      }
      setInterval(async () => {
        await self.getPageDataAsync();
      }, refreshPeriod * 1000)
    });

    setTimeout(async () => {
      const pageTemplate = document.querySelector('webc-app-loader[tag="home"] page-template');
      await pageTemplate.componentOnReady();
      const ionContent = pageTemplate.shadowRoot.querySelector('ion-content');
      await ionContent.componentOnReady();
      ionContent.scrollEvents = true;
      await self.getPageDataAsync();
      ionContent.addEventListener('ionScrollStart', async (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
        let fake_item = self.element.querySelector('#last-fake-item');
        if (fake_item && self.isInViewport(fake_item)) {
          await self.getPageDataAsync();
        }
      })
    }, 0)


    this.onTagClick("view-details", (model, target, event) => {
      let dbApi = require("opendsu").loadApi("db");
      dbApi.getMainEnclaveDB((err, enclaveDB) => {
        if (err) {
          console.log('Error on getting enclave DB');
          return;
        }
        enclaveDB.getRecord(constants.HISTORY_TABLE, model.pk, (err, record) => {
          if (err) {
            console.log("Could not find record for pk: ", model.pk);
            return;
          }

          this.navigateToPageTag("drug-details", {
            productData: record
          })
        })
      })
    });

  }

  isInViewport(elem) {
    let bounding = elem.getBoundingClientRect();
    return (
      bounding.top >= 0 &&
      bounding.left >= 0 &&
      bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  async getPageDataAsync() {

    let dbApi = require("opendsu").loadApi("db");
    let advancedUser = await this.model.settingsService.asyncReadSetting("advancedUser");
    this.advancedUser = !!advancedUser;
    let refreshPeriod = await this.model.settingsService.asyncReadSetting("refreshPeriod");
    this.secondsToUpdate = refreshPeriod || constants.DEFAULT_REFRESH_PERIOD;

    try {
      this.dbStorage = await $$.promisify(dbApi.getMainEnclaveDB)();

      if (this.model.products.length && this.model.products[this.model.products.length - 1].lastFakeItem) {
        this.model.products.pop();
      }
      let lastCreatedAt = this.model.products.length ? this.model.products[this.model.products.length - 1].createdAt : new Date().toISOString();

      let results = await $$.promisify(this.dbStorage.filter)(constants.HISTORY_TABLE, `createdAt < ${lastCreatedAt}`, "dsc", this.model.itemsOnPage);

      if (results && results.length > 0) {
        if (document.querySelector(".datatable-title") && document.querySelector(".datatable-title").hidden) {
          document.querySelector(".datatable-title").hidden = false;
        }

        for (let result of results) {
          if (Date.now() - result['__timestamp'] > this.secondsToUpdate * 1000) {
            let batchData;
            let product;
            let batchStatusService = new BatchStatusService();
            try {
              let dsuDataRetrievalService = new DSUDataRetrievalService(result.gtinSSI);
              product = await dsuDataRetrievalService.asyncReadProductData();
              batchData = await dsuDataRetrievalService.asyncReadBatchData();
              batchStatusService.getProductStatus(batchData, result.gs1Fields);
            } catch (e) {
              batchStatusService.unableToVerify();
            }

            result.status = batchStatusService.status;
            result.statusMessage = batchStatusService.statusMessage;
            result.statusType = batchStatusService.statusType;
            result.expiryForDisplay = batchStatusService.expiryForDisplay;
            result.expiryTime = batchStatusService.expiryTime;
            result.snCheck = batchStatusService.snCheck;
            result.product = product;
            result.batchData = batchData;
            result = await $$.promisify(this.dbStorage.updateRecord)(constants.HISTORY_TABLE, result.pk, result)
          }
          result.advancedView = this.advancedUser;
        }
        this.model.products = [...this.model.products, ...results];
      } else {
        if (document.querySelector(".datatable-title") && document.querySelector(".datatable-title").hidden) {
          document.querySelector(".datatable-title").hidden = true;
        }
      }
    } catch (e) {
      console.log('Error on getting async page data: ', e);
    }
    //group by month and year
    let groups = {};
    for (let product of this.model.products) {
      let date = product.createdAt.slice(0, 7);
      if (!groups[date]) {
        groups[date] = [];
        product.firstGroupItem = true;
      } else {
        product.firstGroupItem = false;
      }
      let humanDate = utils.convertFromISOtoYYYY_HM(product.createdAt.split('T')[0], true, "");
      product.groupDate = humanDate.slice(4);
      let timeLabel = "ago";
      product.timeFrameOrDate = `${utils.getTimeSince(product.createdAt)} ${timeLabel}` || humanDate;

      groups[date].push(product);
    }
    if (this.model.products.length > 0 && this.model.products.length >= this.model.itemsOnPage) {
      this.model.products.push({lastFakeItem: true});
    }
    return this.model.products;
  }
}

