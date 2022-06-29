const {WebcController} = WebCardinal.controllers;

export default class HelpController extends WebcController {
  constructor(...props) {
    super(...props);
    this.onTagClick("close-page", () => {
      this.navigateToPageTag("settings")
    })
  }
}
