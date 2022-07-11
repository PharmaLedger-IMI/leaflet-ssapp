import SettingsService from "../services/SettingsService.js";

const {WebcController} = WebCardinal.controllers;

export default class OnBoardingController extends WebcController {
  constructor(...props) {
    super(...props);
    this.model = {firstStep: true}
    this.onTagClick("get-started", (model, target, event) => {
      this.model.firstStep = false;
      this.model.confirmDisagree = false;
    });
    this.onTagClick("agree-terms", (model, target, event) => {
      let dbApi = require("opendsu").loadApi("db");
      dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
        if (err) {
          console.log('Error on getting enclave DB');
          return;
        }

        let settingsService = new SettingsService(enclaveDB);
        await settingsService.asyncWriteSetting("onbordingComplete", true);

        this.navigateToPageTag("home");
      })
    })
    this.onTagClick("disagree-terms", (model, target, event) => {
      this.querySelector(".terms-and-conditions").scrollTo({top: 0, behavior: 'smooth'});
      this.model.confirmDisagree = true;
    })
    this.onTagClick("disagree-terms-confirm", (model, target, event) => {
      this.model.firstStep = true;
    })
  }

}