const {WebcController} = WebCardinal.controllers;
import XMLDisplayService from "../services/XMLDisplayService/XMLDisplayService.js";

export default class SMPCController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.setModel({});
    if (typeof history.location.state !== "undefined") {
      this.gtinSSI = history.location.state.gtinSSI;
      this.gs1Fields = history.location.state.gs1Fields;
      this.model.titleLabel = history.location.state.titleLabel;
    }

    this.on("go-back", (event) => {
      /*            history.push({
                      pathname: `${new URL(history.win.basePath).pathname}drug-details`,
                      state: {
                          gtinSSI: this.gtinSSI,
                          gs1Fields:this.gs1Fields
                      }
                  });*/

      this.navigateToPageTag("drug-details", {
        gtinSSI: this.gtinSSI,
        gs1Fields: this.gs1Fields
      });
    })

    const xmlDisplayService = new XMLDisplayService(this.DSUStorage, element, this.gtinSSI, "smpc", "smpc.xml", this.model);
    xmlDisplayService.populateModel();
  }
}
