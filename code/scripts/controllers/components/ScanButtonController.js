const { WebcController } = WebCardinal.controllers;

export default class ScanButtonController extends WebcController {
  constructor(...props) {
    super(...props);

    this.onTagClick('start-scan', () => {
      this.navigateToPageTag('scan')
    });
  }
}
