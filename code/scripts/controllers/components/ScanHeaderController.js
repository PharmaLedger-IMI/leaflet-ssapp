const {WebcController} = WebCardinal.controllers;

export default class ScanHeaderController extends WebcController {
  constructor(...props) {
    super(...props);

    this.onTagClick('switch-camera', async () => {
      document.dispatchEvent(new CustomEvent('leaflet-ssapp:switch-camera'));
    });

    this.onTagClick('cancel-scan', () => {
      this.navigateToPageTag("home");
    });
  }
}
