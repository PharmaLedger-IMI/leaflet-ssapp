import constants from "../../constants.js";
import SettingsService from "../services/SettingsService.js";
import recordUtils from "../../utils.js"

const gtinResolver = require("gtin-resolver");
const utils = gtinResolver.utils;
const LeafletInfoService = gtinResolver.LeafletInfoService;

const {WebcController} = WebCardinal.controllers;
const {DataSource} = WebCardinal.dataSources;

class HistoryDataSource extends DataSource {
  constructor(...props) {
    super(...props);
    this.setPageSize(8);
  }

  async getPageDataAsync(startOffset, dataLengthForCurrentPage) {
    this.groups = {}
    let dbApi = require("opendsu").loadApi("db");
    this.enclaveDB = await $$.promisify(dbApi.getMainEnclaveDB)();
    this.settingsService = new SettingsService(this.enclaveDB);
    let products = [];
    let advancedUser = await this.settingsService.asyncReadSetting("advancedUser");
    this.advancedUser = !!advancedUser;
    let refreshPeriod = await this.settingsService.asyncReadSetting("refreshPeriod");
    this.secondsToUpdate = refreshPeriod || constants.DEFAULT_REFRESH_PERIOD;

    try {

      let results = await $$.promisify(this.enclaveDB.filter)(constants.HISTORY_TABLE, "createdAt > 0", "dsc");
      this.setRecordsNumber(results.length);
      if (results && results.length > 0) {
        if (document.querySelector(".datatable-title") && document.querySelector(".datatable-title").hidden) {
          document.querySelector(".datatable-title").hidden = false;
        }
        results = results.slice(startOffset, startOffset + dataLengthForCurrentPage);
        for (let result of results) {
          if (Date.now() - result['__timestamp'] > this.secondsToUpdate * 1000) {
            result = await recordUtils.updateRecordData(this.enclaveDB, result);
          }
          result.advancedView = this.advancedUser;
        }
        products = results;
      } else {
        if (document.querySelector(".datatable-title") && document.querySelector(".datatable-title").hidden) {
          document.querySelector(".datatable-title").hidden = true;
        }
      }
    } catch (e) {
      console.log('Error on getting async page data: ', e);
    }
    //group by month and year
    for (let product of products) {
      let date = product.createdAt.slice(0, 7);
      product.statusMessage = this.translate(product.statusMessage);
      if (!this.groups[date]) {
        this.groups[date] = [];
      }
      let humanDate = utils.convertFromISOtoYYYY_HM(product.createdAt.split('T')[0], true, "");
      let month = this.translate(humanDate.slice(4).slice(0, -6));
      product.groupDate = `${month} ${humanDate.slice(-4)}`;
      let timeLabel = this.translate("ago");
      let sinceTime = utils.getTimeSince(product.createdAt);
      if (sinceTime) {
        let timeNr = this.translate(sinceTime.split(" ")[0]);
        let translatedUnit = this.translate(sinceTime.split(" ")[1]);
        product.timeFrameOrDate = `${timeNr} ${translatedUnit} ${timeLabel}`
      } else {
        product.timeFrameOrDate = humanDate;
      }
      this.groups[date].push(product);
    }

    Object.values(this.groups).forEach(group => {
      group[0].firstGroupItem = true;
      if (group.length > 1) {
        group[0].groupPosition = "first"
        group[group.length - 1].groupPosition = "last"
      } else {
        group[0].groupPosition = "one-item-group"
      }

    })

    return products;
  }

}

export default class HistoryController extends WebcController {
  constructor(...props) {
    super(...props);

    this.model = {
      productsDataSource: new HistoryDataSource({useInfiniteScroll: true})
    }
    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }

      const {productsDataSource} = this.model;
      let settingsService = new SettingsService(enclaveDB);

      let appLang = await settingsService.asyncReadSetting("preferredLanguage");
      this.applySkinForCurrentPage(appLang);
      this.setSkin(appLang);
/*      settingsService.readSetting("refreshPeriod", (err, refreshPeriod) => {
        if (err || !refreshPeriod) {
          refreshPeriod = constants.DEFAULT_REFRESH_PERIOD;
        }
        setInterval(async () => {
          await productsDataSource.forceLoading();
          await productsDataSource.forceUpdate();
        }, refreshPeriod * 1000)
      });*/
      this.onTagClick("view-details", (model, target, event) => {

        this.navigateToPageTag("drug-summary", {
          productData: model.pk
        })
      });
      this.onTagClick("open-settings", () => {
        this.navigateToPageTag("settings")
      })

    })
  }
}
