const { WebcController } = WebCardinal.controllers;

export default class ScanErrorController extends WebcController {
  constructor(...props) {
    super(...props);
    const history = props[1];
    this.model = {
      ...history.location.state,
      title: 'Product not found'
    };
    this.model.showSecondaryMessage = !!this.model.secondaryMessage;
    this.model.showData = this.model.fields && Object.keys(this.model.fields).length > 0;
  }
}
