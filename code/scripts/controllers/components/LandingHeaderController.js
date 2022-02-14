const { WebcController } = WebCardinal.controllers;

export default class LandingHeaderController extends WebcController {
  constructor(...props) {
    super(...props);

    this.closeMenuFlag = true;
    this.menuOpened = false;

    if (document.getElementsByClassName("mobile-container")) {
      document.getElementsByClassName("mobile-container")[0].addEventListener("click", (event) => {
        if (this.closeMenuFlag && this.menuOpened) {
          this.closeMenu();
        }
        this.closeMenuFlag = true;
      })
    }

    if (document.getElementById("popup-menu-content")) {
      document.getElementById("popup-menu-content").addEventListener("click", (event) => {
        this.closeMenuFlag = false;
      })
    }

    this.onTagClick("open-menu", () => {
      this.querySelector(".initial-state").classList.toggle("ion-hide");
      this.querySelector(".open-state").classList.toggle("ion-hide");
      document.getElementsByClassName("overlay")[0].style.visibility = "visible";
      document.getElementsByClassName("overlay")[0].style.opacity = 1;
      this.menuOpened = true;
    })

    this.onTagClick("close-menu", () => {
      this.closeMenu();
    });

    this.onTagClick("menu-go-back", () => {
      this.navigateToPageTag("home");
    })
  }

  closeMenu() {
    this.querySelector(".initial-state").classList.toggle("ion-hide");
    this.querySelector(".open-state").classList.toggle("ion-hide");
    document.getElementsByClassName("overlay")[0].style.visibility = "hidden";
    document.getElementsByClassName("overlay")[0].style.opacity = 0;
    this.menuOpened = false;
  }
}
