const {WebcController} = WebCardinal.controllers;

export default class HelpController extends WebcController {
  constructor(...props) {
    super(...props);
    this.model.pageContent = `
        <iframe style="width: 100%; height: 100%; font-family: 'DM Sans regular'; border: 0" src="https://app.termly.io/document/privacy-policy/40430c0a-9e30-4690-b4a7-2c2f56433919"></iframe>

                             `
  }
}
