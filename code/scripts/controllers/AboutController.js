const {WebcController} = WebCardinal.controllers;

export default class HelpController extends WebcController {
  constructor(...props) {
    super(...props);
    this.model.pageContent = `<div class="content-wrapper-container" slot="content-slot">
                    <iframe src="https://Pharmaledger.eu"></iframe>
                </div>`
  }
}
