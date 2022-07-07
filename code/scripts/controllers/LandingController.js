import SettingsService from "../services/SettingsService.js";

const {WebcController} = WebCardinal.controllers;

export default class OnBoardingController extends WebcController {
  constructor(...props) {
    super(...props);
    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }

      let settingsService = new SettingsService(enclaveDB);
      let onbordingComplete = await settingsService.asyncReadSetting("onbordingComplete");

      if (!onbordingComplete) {
        this.navigateToPageTag("onboarding")
      } else {
        this.navigateToPageTag("home")
      }
    })
  }
}