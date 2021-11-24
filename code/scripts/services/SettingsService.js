import constants from "../../constants.js";

const DEFAULT_VALUES = {
  "preferredLanguage": "en",
  "networkName": constants.DEFAULT_NETWORK_NAME,
  "scanditLicense": "",
  "advancedUser": false,
  "refreshPeriod": constants.DEFAULT_REFRESH_PERIOD

}
export default class SettingsService {
  constructor(enclaveDB) {
    if (enclaveDB) {
      this.enclaveDB = enclaveDB;
    }
    if (!this.enclaveDB) {
      let dbApi = require("opendsu").loadApi("db");
      dbApi.getMainEnclaveDB((err, enclaveDB) => {
        if (err) {
          console.log('Error on getting enclave DB');
          return;
        }
        this.enclaveDB = enclaveDB
        this.initDefaultValues();
      })
    } else {
      this.initDefaultValues();
    }

  }

  initDefaultValues() {
    Object.keys(DEFAULT_VALUES).forEach(prop => {
      this.readSetting(prop, (err, result) => {
        if (err) {
          this.writeSetting(prop, DEFAULT_VALUES[prop], (err, record) => {
            if (err) {
              console.log("Error in settings service constructor. Could not insert record for: ", prop, DEFAULT_VALUES[prop]);
            }
          })
        }
      })
    })
  }

  readSetting(property, callback) {
    this.enclaveDB.readKey(property, (err, record) => {
      if (err) {
        console.log("Could not find record for pk: ", property);
        return callback(undefined, typeof DEFAULT_VALUES[property] !== "undefined" ? DEFAULT_VALUES[property] : "");
      }
      return callback(undefined, record);
    })

  }

  asyncReadSetting(property) {
    return new Promise((resolve, reject) => {
      this.readSetting(property, (err, result) => {
        if (err) {
          return reject(err)
        }
        resolve(result);
      })
    })
  }

  writeSetting(property, value, callback) {
    this.enclaveDB.writeKey(property, value, (err, record) => {
      if (err) {
        console.log("Could not insert record for: ", property, value);
        return callback(err);
      }
      return callback(undefined, record);
    })
  }

  asyncWriteSetting(property, value) {
    return new Promise((resolve, reject) => {
      this.writeSetting(property, value, (err, result) => {
        if (err) {
          return reject(err)
        }
        resolve(result);
      })
    })
  }
}
