const {WebcController} = WebCardinal.controllers;

export default class LandingHeaderController extends WebcController {
  constructor(...props) {
    super(...props);
    this.setModel({});
    this.onTagClick("open-menu", async () => {
      this.querySelector(".initial-state").classList.toggle("ion-hide");
      this.querySelector(".open-state").classList.toggle("ion-hide");
      document.getElementsByClassName("overlay")[0].style.visibility = "visible";
      document.getElementsByClassName("overlay")[0].style.opacity = 1;
    })
    this.onTagClick("close-menu", async () => {
      this.querySelector(".initial-state").classList.toggle("ion-hide")
      this.querySelector(".open-state").classList.toggle("ion-hide")
      document.getElementsByClassName("overlay")[0].style.visibility = "hidden";
      document.getElementsByClassName("overlay")[0].style.opacity = 0;
    });

    this.onTagClick("menu-go-back", () => {
      this.navigateToPageTag("home");
    })

  }

}
