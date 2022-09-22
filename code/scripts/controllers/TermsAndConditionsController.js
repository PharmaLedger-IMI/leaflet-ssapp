const {WebcController} = WebCardinal.controllers;

export default class TermsAndConditionsController extends WebcController {
  constructor(...props) {
    super(...props);
    this.model.pageContent = `
    <iframe style="width: 100%; height: 100%; font-family: 'DM Sans regular'; border: 0" src="https://app.termly.io/document/terms-of-use-for-website/76a94ec4-766a-4a6a-b7fe-c68834af6811"></iframe>
    `
  }
}
