const {WebcController} = WebCardinal.controllers;

export default class InfoPageController extends WebcController {
  constructor(...props) {
    super(...props);
    this.querySelector(".page-body").innerHTML = this.model.pageContent;
    this.onTagClick("close-page", () => {
      this.navigateToPageTag("settings")
    })
  }
}
