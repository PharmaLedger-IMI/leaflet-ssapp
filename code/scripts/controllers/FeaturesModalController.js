const {WebcController} = WebCardinal.controllers;
const gtinResolver = require("gtin-resolver");
const openDSU = require("opendsu");
const config = openDSU.loadAPI("config");
export default class FeaturesModalController extends WebcController {

  constructor(element, history) {
    super(element, history);
    this.model = {
      title: "Manage features"
    }
    this.model.features = [];
    config.readEnvFile((err, envFile) => {
      let disabledFeatures = envFile.disabledFeatures.split(",");
      Object.keys(gtinResolver.constants.DISABLED_FEATURES_MAP).forEach(key => {
        this.model.features.push({
          code: key,
          value: key,
          label: gtinResolver.constants.DISABLED_FEATURES_MAP[key].description,
          checked: !!disabledFeatures.find((item) => item.trim() === key)
        })
      })

    })

    this.onTagClick("close-window", () => {
      this.element.dispatchEvent(new Event('closed'));
    });
    this.onTagClick("submit-window", () => {
      let checkboxes = this.element.querySelectorAll(".features-container input[type='checkbox']:checked");
      let disabledFeatures = "";
      checkboxes.forEach((checkbox, index) => {
        disabledFeatures = disabledFeatures + (index !== 0 ? "," : "") + checkbox.name;
      })
      config.setEnv("disabledFeatures", disabledFeatures, (err, env) => {
        if (err) {
          console.log("Could not update environment with disabled features")
        }
        this.element.dispatchEvent(new Event('confirmed'));
      })
    });
  }
}
