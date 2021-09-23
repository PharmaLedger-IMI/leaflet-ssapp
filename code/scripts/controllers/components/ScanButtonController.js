const {WebcController} = WebCardinal.controllers;

export default class ScanButtonController extends WebcController {
  constructor(...props) {
    super(...props);
    this.setModel({});
    this.onTagClick('start-scan', (model, event) => {
      this.navigateToPageTag('scan')
    });
  }

}
