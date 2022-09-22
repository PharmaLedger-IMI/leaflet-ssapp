import SettingsService from "../services/SettingsService.js";

const {WebcController} = WebCardinal.controllers;

export default class OnBoardingController extends WebcController {
  constructor(...props) {
    super(...props);
    this.model = {loading: true}
    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }
      this.settingsService = new SettingsService(enclaveDB);

      let appLang = await this.settingsService.asyncReadSetting("preferredLanguage");
      this.applySkinForCurrentPage(appLang);
      this.setSkin(appLang);
      let host = window.location.host;
      fetch(`http://${host}/jailbreak/details`)
        .then(response => response.text())
        .then(textString => {
          console.log(textString);
          this.model.loading = false;
          if (textString) {
            this.showModalFromTemplate('error-message', () => {
            }, () => {
              this.initialize();
            }, {
              model: {
                title: this.translate("_warning"),
                subtitle: this.translate("_subtitle"),
                messageText: this.translate("jailbroken_msg")
              }, disableExpanding: true, disableFooter: true
            });
          } else {
            this.initialize();
          }
        }).catch(err => {
        this.model.loading = false;
        this.initialize();
      });
    })

  }

  async initialize() {
    let onbordingComplete = await this.settingsService.asyncReadSetting("onbordingComplete");
    if (!onbordingComplete) {
      this.navigateToPageTag("onboarding")
    } else {
      this.navigateToPageTag("home")
    }
  }
}
