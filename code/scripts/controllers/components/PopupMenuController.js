const {WebcController} = WebCardinal.controllers;

export default class PopupMenuController extends WebcController {
  constructor(...props) {
    super(...props);
    this.setModel({});
    this.onTagClick("go-home", () => {
      this.closeMenu();
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
  closeMenu() {
    document.querySelector(".initial-state").classList.toggle("ion-hide");
    document.querySelector(".open-state").classList.toggle("ion-hide");
    document.getElementsByClassName("overlay")[0].style.visibility = "hidden";
    document.getElementsByClassName("overlay")[0].style.opacity = 0;
  }

}
