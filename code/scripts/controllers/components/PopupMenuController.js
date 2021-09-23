const {WebcController} = WebCardinal.controllers;

export default class PopupMenuController extends WebcController {
  constructor(...props) {
    super(...props);
    this.setModel({});
    this.onTagClick("go-home", () => {
      this.navigateToPageTag("home");
    })
    this.onTagClick("go-about", () => {
      this.navigateToPageTag("about");
    })
    this.onTagClick("go-settings", () => {
      this.navigateToPageTag("settings");
    })
    this.onTagClick("go-help", () => {
      this.navigateToPageTag("help");
    })
  }

}
