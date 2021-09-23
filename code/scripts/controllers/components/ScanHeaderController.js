const {WebcController} = WebCardinal.controllers;

export default class ScanHeaderController extends WebcController {
  constructor(...props) {
    super(...props);
    this.setModel({});

    this.onTagClick('switch-camera', async () => {
      const barcodeScanner = document.getElementsByTagName("psk-barcode-scanner")[0]
      await barcodeScanner.switchCamera();
    });
    this.onTagClick('cancel-scan', () => {
      this.navigateToPageTag("home");
    })
  }

}
