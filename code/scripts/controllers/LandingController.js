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
      const config = require("opendsu").loadApi("config");
      this.envFile = await $$.promisify(config.readEnvFile)();
      this.easterEggEnabled = !!this.envFile["easterEggEnabled"];
      this.applySkinForCurrentPage(appLang);
      this.setSkin(appLang);
      let host = window.location.host;
      fetch(`http://${host}/jailbreak/details`)
        .then(response => {
          if (response.status === 200) {
            return response.text()
          } else {
            return this.initialize();
          }
        })
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
                messageText: this.translate("jailbroken_msg"),
                additionalInfo: textString
              }, disableExpanding: true, disableFooter: true
            });
          } else {
            this.initialize();
          }
        }).catch(err => {
        this.model.loading = false;
        this.initialize();
      });

      if (this.easterEggEnabled) {
        this.showJailbreakClicks = 0;
        this.onTagClick("show-jailbreak-msg", () => {
          this.showJailbreakClicks++;
          if (this.showJailbreakClicks >= 3) {
            document.querySelector(".custom-modal-header.additional-info").classList.remove("hiddenElement");
          }
        })
      }

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
