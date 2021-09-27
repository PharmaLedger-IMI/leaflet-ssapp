const {WebcController} = WebCardinal.controllers;

export default class AccordionController extends WebcController {
  constructor(...props) {
    super(...props);
    this.setModel({});
    this.onTagClick("accordion-item-click", (model, target, event) => {
      target.parentElement.classList.toggle("opened");
    })
  }

}
